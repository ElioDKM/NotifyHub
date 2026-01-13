// public/channel-configs/channel-configs.service.ts
import {
  ConflictException,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  Channel,
  CreateChannelConfigDto,
} from './dto/create-channel-config.dto';

type ChannelConfigRecord = Prisma.channel_configGetPayload<{
  select: {
    id: true;
    tenant_id: true;
    channel: true;
    allow_overrides: true;
    created_at: true;
    config_json: true;
  };
}>;

type EmailConfig = {
  smtpHost: string;
  smtpPort: number;
  user: string | null;
  pass: string | null;
  from: string;
};

type EmailConfigSafe = Omit<EmailConfig, 'pass'> & { pass: string | null };

type ExpoPushConfig = { projectId: string };

type ChannelConfigSafe = Omit<ChannelConfigRecord, 'config_json'> & {
  config_json: EmailConfigSafe | ExpoPushConfig;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isEmailConfig(v: unknown): v is EmailConfig {
  if (!isRecord(v)) return false;
  return (
    typeof v.smtpHost === 'string' &&
    typeof v.smtpPort === 'number' &&
    typeof v.from === 'string'
  );
}

function isExpoConfig(v: unknown): v is ExpoPushConfig {
  return isRecord(v) && typeof v.projectId === 'string';
}

@Injectable()
export class ChannelConfigsService {
  constructor(private readonly prisma: PrismaService) {}

  async createForTenant(tenantId: string, dto: CreateChannelConfigDto) {
    const configJson = this.toConfigJson(dto);

    try {
      const created = await this.prisma.channel_config.create({
        data: {
          tenant_id: tenantId,
          channel: dto.channel,
          config_json: configJson,
          allow_overrides: dto.allowOverrides ?? false,
        },
        select: {
          id: true,
          tenant_id: true,
          channel: true,
          allow_overrides: true,
          created_at: true,
          config_json: true,
        },
      });

      // ✅ Option sécurité: renvoyer une version “safe”
      return this.sanitizeConfig(created);
    } catch (e: unknown) {
      // Unique violation => 409 ConfigExists
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('ConfigExists');
      }
      throw e;
    }
  }

  private toConfigJson(dto: CreateChannelConfigDto) {
    if (dto.channel === Channel.EMAIL) {
      const c = dto.email;
      if (!c?.smtpHost || !c?.smtpPort || !c?.from) {
        throw new BadRequestException(
          'BadRequest: missing smtpHost/smtpPort/from',
        );
      }
      return {
        smtpHost: c.smtpHost,
        smtpPort: c.smtpPort,
        user: c.user ?? null,
        pass: c.pass ?? null,
        from: c.from,
      };
    }

    if (dto.channel === Channel.EXPO_PUSH) {
      const c = dto.expoPush;
      if (!c?.projectId) {
        throw new BadRequestException('BadRequest: missing projectId');
      }
      return { projectId: c.projectId };
    }

    throw new BadRequestException('BadRequest: unsupported channel');
  }

  private sanitizeConfig(record: ChannelConfigRecord): ChannelConfigSafe {
    if (record.channel === 'EMAIL' && isEmailConfig(record.config_json)) {
      const cfg = record.config_json;

      return {
        ...record,
        config_json: {
          ...cfg,
          pass: cfg.pass ? '********' : null,
        },
      };
    }

    if (record.channel === 'EXPO_PUSH' && isExpoConfig(record.config_json)) {
      return {
        ...record,
        config_json: record.config_json,
      };
    }

    return {
      ...record,
      config_json: record.config_json as unknown as ExpoPushConfig,
    };
  }
}
