import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateNotificationDto,
  NotificationByUserDto,
} from './dto/create-notification.dto';
import {
  Prisma,
  notification_status,
  attempt_status,
  plan,
  channel,
} from '@prisma/client';
import { EmailSender } from './senders/email.sender';
import { ExpoSender } from './senders/expo.sender';
import { EmailConfig, ExpoContent } from 'src/common/types/notifications';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DateTime } from 'luxon';
import { Logger } from '@nestjs/common';

/* ------------------ Type ------------------ */

type SendNotificationJob = { notificationId: string };

type NotificationInlineDto = CreateNotificationDto & {
  recipientMode: 'INLINE';
  to: string;
};

type InlineSnapshot = { mode: 'INLINE'; to: string };
type ByUserSnapshot = {
  mode: 'BY_USER';
  userExternalId: string;
  endpoints: string[];
};
type RecipientSnapshot = InlineSnapshot | ByUserSnapshot;

type EmailContent = { text?: string; html?: string };

/* ------------------ helpers et guards------------------ */

function isByUserDto(dto: CreateNotificationDto): dto is NotificationByUserDto {
  return dto.recipientMode === 'BY_USER';
}

function isInlineDto(dto: CreateNotificationDto): dto is NotificationInlineDto {
  return dto.recipientMode === 'INLINE' && 'to' in dto;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  const isJson = (v: unknown): v is Prisma.InputJsonValue => {
    if (
      v === null ||
      typeof v === 'string' ||
      typeof v === 'number' ||
      typeof v === 'boolean'
    ) {
      return true;
    }
    if (Array.isArray(v)) return v.every(isJson);
    if (isRecord(v)) return Object.values(v).every(isJson);
    return false;
  };

  if (!isJson(value)) {
    throw new BadRequestException('InvalidContentJson');
  }

  return value;
}

function assertPlanAllowsSendAt(tenantPlan: plan, sendAt: Date) {
  const now = new Date();
  const diffMs = sendAt.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (tenantPlan === plan.FREE) {
    throw new ForbiddenException('PlanFeatureNotAvailable');
  }

  if (tenantPlan === plan.PRO && diffDays > 30) {
    throw new UnprocessableEntityException(
      'ScheduleHorizonExceeded (max 30 days)',
    );
  }

  if (tenantPlan === plan.ULTRA && diffDays > 365) {
    throw new UnprocessableEntityException(
      'ScheduleHorizonExceeded (max 365 days)',
    );
  }
}

function parseEmailConfig(value: unknown): EmailConfig {
  if (!isRecord(value)) throw new BadRequestException('InvalidEmailConfig');

  // Minimal runtime sanity checks
  const smtpHost = value.smtpHost;
  const smtpPort = value.smtpPort;
  const from = value.from;

  if (
    typeof smtpHost !== 'string' ||
    typeof smtpPort !== 'number' ||
    typeof from !== 'string'
  ) {
    throw new BadRequestException('InvalidEmailConfig');
  }

  return value as EmailConfig;
}

function parseExpoContent(value: unknown): ExpoContent {
  if (!isRecord(value)) throw new BadRequestException('InvalidExpoContent');

  const title = value.title;
  const body = value.body;

  if (typeof title !== 'string' || typeof body !== 'string') {
    throw new BadRequestException('InvalidExpoContent');
  }

  return value as ExpoContent;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout after ${ms}ms`));
    }, ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error('Unknown error'));
      },
    );
  });
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
}

function parseRecipientSnapshot(v: unknown): RecipientSnapshot {
  if (!isRecord(v)) throw new BadRequestException('RecipientSnapshotMissing');

  const mode = v.mode;
  if (mode === 'INLINE') {
    if (typeof v.to !== 'string')
      throw new BadRequestException('RecipientSnapshotInvalid');
    return { mode: 'INLINE', to: v.to };
  }

  if (mode === 'BY_USER') {
    if (typeof v.userExternalId !== 'string' || !isStringArray(v.endpoints)) {
      throw new BadRequestException('RecipientSnapshotInvalid');
    }
    return {
      mode: 'BY_USER',
      userExternalId: v.userExternalId,
      endpoints: v.endpoints,
    };
  }

  throw new BadRequestException('RecipientSnapshotInvalid');
}

function parseEmailContent(v: unknown): EmailContent {
  if (!isRecord(v)) throw new BadRequestException('InvalidEmailContent');

  const text = v.text;
  const html = v.html;

  if (text !== undefined && typeof text !== 'string') {
    throw new BadRequestException('InvalidEmailContent');
  }
  if (html !== undefined && typeof html !== 'string') {
    throw new BadRequestException('InvalidEmailContent');
  }

  if (text === undefined && html === undefined) {
    throw new BadRequestException('InvalidEmailContent');
  }

  return {
    ...(text !== undefined ? { text } : {}),
    ...(html !== undefined ? { html } : {}),
  };
}

export function normalizeSendAt(
  value: string,
  tenantTimeZone = 'Europe/Paris',
): Date {
  const raw = value.trim();
  let dt: DateTime;

  // date only
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    dt = DateTime.fromISO(raw, { zone: tenantTimeZone }).set({
      hour: 9,
      minute: 0,
      second: 0,
      millisecond: 0,
    });
  } else {
    if (hasZone(raw)) {
      dt = DateTime.fromISO(raw, { setZone: true });
    } else {
      dt = DateTime.fromISO(raw, { zone: tenantTimeZone });
    }
  }

  if (!dt.isValid) throw new BadRequestException('InvalidSendAt');
  if (dt.toMillis() <= DateTime.now().toMillis()) {
    throw new BadRequestException('sendAt must be in the future');
  }

  return dt.toJSDate(); // absolute instant, stored in DB as UTC
}

function hasZone(iso: string): boolean {
  return /([zZ]|[+-]\d{2}:\d{2})$/.test(iso);
}

/* ------------------ Service ------------------ */

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailSender: EmailSender,
    private readonly expoSender: ExpoSender,
    @InjectQueue('notifications')
    private readonly notifQueue: Queue<SendNotificationJob>,
  ) {}

  private readonly logger = new Logger(NotificationsService.name);
  async createAndSend(dto: CreateNotificationDto, tenantId: string) {
    // 0) Load tenant plan (for sendAt feature gate)
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true },
    });

    if (!tenant) throw new BadRequestException('TenantNotFound');

    // 1) Resolve recipients + optional userId
    let userId: string | null = null;
    let recipients: string[] = [];

    if (isByUserDto(dto)) {
      const user = await this.prisma.user.findUnique({
        where: {
          uk_user_tenant_external: {
            tenant_id: tenantId,
            external_id: dto.userExternalId,
          },
        },
        select: { id: true, is_active: true },
      });

      if (!user || !user.is_active) {
        throw new UnprocessableEntityException('UserNotFound');
      }
      userId = user.id;

      const subs = await this.prisma.subscription.findMany({
        where: {
          user_id: user.id,
          channel: dto.channel,
        },
        orderBy: { created_at: 'desc' },
        select: { endpoint: true },
      });

      recipients = subs.map((s) => s.endpoint);
      if (recipients.length === 0) {
        throw new UnprocessableEntityException('NoValidSubscription');
      }
    } else if (isInlineDto(dto)) {
      if (!dto.to || typeof dto.to !== 'string') {
        throw new BadRequestException('InvalidRecipient');
      }
      recipients = [dto.to];
    } else {
      throw new BadRequestException('InvalidRecipientMode');
    }

    // 2) Resolve sendAt
    const tenantTimeZone = 'Europe/Paris'; // MVP: plus tard => tenant.timezone
    const sendAt = dto.sendAt
      ? normalizeSendAt(dto.sendAt, tenantTimeZone)
      : new Date();

    // 3) Plan gating/horizon
    if (dto.sendAt) {
      assertPlanAllowsSendAt(tenant.plan, sendAt);
    }

    // 4) Optionally: validate channel config exists now (fail fast)
    const cfgExists = await this.prisma.channel_config.findUnique({
      where: {
        uk_cfg_tenant_channel: {
          tenant_id: tenantId,
          channel: dto.channel,
        },
      },
      select: { id: true },
    });

    if (!cfgExists) {
      throw new BadRequestException('ChannelConfigNotFound');
    }

    // 5) Create notification in DB (always QUEUED)
    const notification = await this.prisma.notification.create({
      data: {
        tenant_id: tenantId,
        user_id: userId,
        channel: dto.channel,
        recipient_mode: dto.recipientMode,
        subject: dto.subject ?? null,
        content_json: toPrismaJson(dto.content),
        send_at: sendAt,
        recipient_snapshot: isByUserDto(dto)
          ? {
              mode: 'BY_USER',
              userExternalId: dto.userExternalId,
              endpoints: recipients,
            }
          : {
              mode: 'INLINE',
              to: recipients[0],
            },
        status: notification_status.QUEUED,
      },
    });

    // 6) Enqueue BullMQ job with delay
    recipients = [...new Set(recipients)];
    const delayMs = Math.max(0, notification.send_at!.getTime() - Date.now());

    await this.notifQueue.add(
      'send',
      { notificationId: notification.id },
      {
        jobId: notification.id,
        delay: delayMs,
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    // 7) Story response
    return {
      id: notification.id,
      status: 'QUEUED',
      sendAt: notification.send_at,
    };
  }

  /**
   * Worker path:
   * called by NotificationsProcessor for each attempt
   */
  async performSend(notificationId: string, tryNumber: number): Promise<void> {
    // 1) Load notification (source of truth)
    const notif = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      select: {
        id: true,
        tenant_id: true,
        channel: true,
        subject: true,
        content_json: true,
        recipient_snapshot: true,
        status: true,
      },
    });

    if (!notif) return;

    // If already delivered/failed, skip (idempotent worker behavior)
    if (
      notif.status === notification_status.DELIVERED ||
      notif.status === notification_status.FAILED
    ) {
      return;
    }

    // 2) Mark SENDING + sent_at (only update if first time or re-attempt)
    await this.prisma.notification.update({
      where: { id: notif.id },
      data: {
        status: notification_status.SENDING,
        sent_at: new Date(),
      },
    });

    // 3) Resolve recipients from snapshot
    const snap = parseRecipientSnapshot(notif.recipient_snapshot);

    let recipients: string[] = [];
    if (snap.mode === 'INLINE') {
      recipients = [snap.to];
    } else {
      recipients = snap.endpoints;
    }

    if (recipients.length === 0) {
      await this.writeAttemptAndThrow(
        notif.id,
        tryNumber,
        new Error('NoValidRecipients'),
      );
      return;
    }

    // 4) Load channel config at send time
    const channelConfig = await this.prisma.channel_config.findUnique({
      where: {
        uk_cfg_tenant_channel: {
          tenant_id: notif.tenant_id,
          channel: notif.channel,
        },
      },
      select: { config_json: true },
    });

    if (!channelConfig) {
      await this.writeAttemptAndThrow(
        notif.id,
        tryNumber,
        new Error('ChannelConfigNotFound'),
      );
      return;
    }

    // 5) Execute send (timeout 10s) + attempt log
    await this.sendWithAttempt(notif.id, tryNumber, async () => {
      if (notif.channel === channel.EMAIL) {
        const emailConfig = parseEmailConfig(channelConfig.config_json);
        const emailContent = parseEmailContent(notif.content_json);

        for (const to of recipients) {
          await withTimeout(
            this.emailSender.send({
              to,
              subject: notif.subject ?? '',
              content: emailContent,
              config: emailConfig,
              notificationId: notif.id,
              tryNumber,
            }),
            10_000,
          );
        }
        return;
      }

      if (notif.channel === channel.EXPO_PUSH) {
        const expoContent = parseExpoContent(notif.content_json);

        for (const to of recipients) {
          await withTimeout(
            this.expoSender.send({ to, content: expoContent }),
            10_000,
          );
        }
        return;
      }

      throw new Error('UnsupportedChannel');
    });

    // 6) Update notification -> DELIVERED
    await this.prisma.notification.update({
      where: { id: notif.id },
      data: {
        status: notification_status.DELIVERED,
        delivered_at: new Date(),
        error: null,
      },
    });
  }

  /**
   * Called by processor when last attempt is reached
   */
  async markFailed(notificationId: string, err: unknown): Promise<void> {
    await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: notification_status.FAILED,
        error: err instanceof Error ? err.message : 'Unknown error',
      },
    });
  }

  /* -------------------- Attempt logging -------------------- */

  private async sendWithAttempt(
    notificationId: string,
    tryNumber: number,
    sendFn: () => Promise<void>,
  ): Promise<void> {
    await sendFn();
    try {
      await this.prisma.delivery_attempt.create({
        data: {
          notification_id: notificationId,
          try: tryNumber,
          status: attempt_status.OK,
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `[ATTEMPT LOG FAILED] notificationId=${notificationId} try=${tryNumber} error=${msg}`,
      );
    }
  }

  private async writeAttemptAndThrow(
    notificationId: string,
    tryNumber: number,
    err: Error,
  ): Promise<void> {
    await this.prisma.delivery_attempt.create({
      data: {
        notification_id: notificationId,
        try: tryNumber,
        status: attempt_status.ERROR,
        error: err.message,
      },
    });

    throw err;
  }
}
