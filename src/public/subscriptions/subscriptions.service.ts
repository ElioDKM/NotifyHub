// public/subscriptions/subscriptions.service.ts
import {
  BadRequestException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { channel } from '@prisma/client';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crée une subscription pour un utilisateur donné dans un tenant donné
   */
  async createForUser(dto: CreateSubscriptionDto, tenantId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        uk_user_tenant_external: {
          tenant_id: tenantId,
          external_id: dto.userExternalId,
        },
      },
    });

    if (!user || !user.is_active) {
      throw new UnprocessableEntityException('UserNotFound');
    }

    this.validateEndpoint(dto.channel, dto.endpoint);

    const subscription = await this.prisma.subscription.create({
      data: {
        user_id: user.id,
        channel: dto.channel,
        endpoint: dto.endpoint,
        meta: dto.meta,
      },
      select: {
        id: true,
        channel: true,
        endpoint: true,
        meta: true,
        created_at: true,
      },
    });

    return subscription;
  }

  /**
   * Valide l’endpoint selon le channel.
   */
  private validateEndpoint(channel: channel, endpoint: string) {
    if (channel === 'EMAIL') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(endpoint)) {
        throw new UnprocessableEntityException('InvalidEndpoint');
      }
    }

    if (channel === 'EXPO_PUSH') {
      if (!endpoint.startsWith('ExponentPushToken[')) {
        throw new UnprocessableEntityException('InvalidEndpoint');
      }
    }
  }

  /**
   * Liste les subscriptions pour un utilisateur donné dans un tenant donné
   */
  async listForUser(
    userExternalId: string,
    tenantId: string,
    channelFilter?: channel,
  ) {
    const user = await this.prisma.user.findUnique({
      where: {
        uk_user_tenant_external: {
          tenant_id: tenantId,
          external_id: userExternalId,
        },
      },
    });

    if (!user) {
      throw new BadRequestException('UserNotFound');
    }

    const where: {
      user_id: string;
      channel?: channel;
    } = {
      user_id: user.id,
    };

    if (channelFilter) {
      where.channel = channelFilter;
    }

    return this.prisma.subscription.findMany({
      where,
      orderBy: {
        created_at: 'desc',
      },
      select: {
        id: true,
        channel: true,
        endpoint: true,
        valid_until: true,
        created_at: true,
      },
    });
  }

  /**
   * Supprime une subscription pour un tenant donné
   */
  async deleteForTenant(subscriptionId: string, tenantId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        user: true,
      },
    });

    if (!subscription) {
      return false;
    }

    if (subscription.user.tenant_id !== tenantId) {
      return false;
    }

    await this.prisma.subscription.delete({
      where: { id: subscriptionId },
    });

    return true;
  }
}
