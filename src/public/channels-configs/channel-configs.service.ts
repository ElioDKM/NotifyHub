// public/channel-configs/channel-configs.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Prisma, channel } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ChannelDto,
  CreateChannelConfigDto,
  ListChannelConfigsDto,
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

/**
 * Type guards
 */
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isEmailConfig(v: unknown): v is EmailConfig {
  return (
    isRecord(v) &&
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

  /**
   * Crée une configuration de canal pour le tenant donné
   */
  async createForTenant(tenantId: string, dto: CreateChannelConfigDto) {
    const configJson = this.toConfigJson(dto);

    try {
      const created: ChannelConfigRecord =
        await this.prisma.channel_config.create({
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

      return this.sanitizeConfig(created);
    } catch (e: unknown) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('ConfigExists');
      }
      throw e;
    }
  }

  /**
   * Liste les configurations de canaux pour le tenant donné
   */
  async listForTenant(
    tenantId: string,
    query: ListChannelConfigsDto,
  ): Promise<ChannelConfigSafe[]> {
    const where: {
      tenant_id: string;
      channel?: channel;
    } = {
      tenant_id: tenantId,
    };

    if (query.channel) {
      where.channel = query.channel;
    }

    const configs: ChannelConfigRecord[] =
      await this.prisma.channel_config.findMany({
        where,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          tenant_id: true,
          channel: true,
          allow_overrides: true,
          created_at: true,
          config_json: true,
        },
      });

    return configs.map((cfg) => this.sanitizeConfig(cfg));
  }

  /**
   * Convertit un DTO de configuration de canal en JSON
   */
  private toConfigJson(dto: CreateChannelConfigDto) {
    if (dto.channel === ChannelDto.EMAIL) {
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

    if (dto.channel === ChannelDto.EXPO_PUSH) {
      const c = dto.expoPush;
      if (!c?.projectId) {
        throw new BadRequestException('BadRequest: missing projectId');
      }
      return { projectId: c.projectId };
    }

    throw new BadRequestException('BadRequest: unsupported channel');
  }

  /**
   * Nettoie une configuration de canal pour éviter d'exposer des informations sensibles
   */
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
      config_json: record.config_json as ExpoPushConfig,
    };
  }
}
