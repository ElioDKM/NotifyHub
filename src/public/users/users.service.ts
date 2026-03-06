import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { notification_status } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('notifications') private readonly notifQueue: Queue,
  ) {}

  /**
   * Crée un utilisateur pour un tenant donné
   */
  async createUser(dto: CreateUserDto, tenantId: string) {
    if (!dto.externalId) {
      throw new BadRequestException('externalId is required');
    }

    const existing = await this.prisma.user.findUnique({
      where: {
        uk_user_tenant_external: {
          tenant_id: tenantId,
          external_id: dto.externalId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('DuplicateUser: externalId already exists');
    }

    const user = await this.prisma.user.create({
      data: {
        external_id: dto.externalId,
        tenant_id: tenantId,
      },
      select: {
        id: true,
        external_id: true,
        created_at: true,
      },
    });

    return user;
  }

  /**
   * Modifie l’externalId d’un utilisateur donné dans un tenant donné
   */
  setNewExternalId(
    externalId: string,
    tenantId: string,
    newExternalId: string,
  ) {
    if (!newExternalId) {
      throw new BadRequestException('newExternalId is required');
    }

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: {
          uk_user_tenant_external: {
            tenant_id: tenantId,
            external_id: externalId,
          },
        },
      });

      if (!user) {
        throw new NotFoundException('UserNotFound');
      }

      const duplicate = await tx.user.findUnique({
        where: {
          uk_user_tenant_external: {
            tenant_id: tenantId,
            external_id: newExternalId,
          },
        },
      });

      if (duplicate) {
        throw new ConflictException(
          'DuplicateUser: newExternalId already in use',
        );
      }

      const updated = await tx.user.update({
        where: { id: user.id },
        data: { external_id: newExternalId },
        select: {
          id: true,
          external_id: true,
        },
      });

      return updated;
    });
  }

  /**
   * Activer / désactiver un utilisateur (soft delete)
   */
  async setActiveState(
    externalId: string,
    tenantId: string,
    isActive: boolean,
  ) {
    const user = await this.prisma.user.findUnique({
      where: {
        uk_user_tenant_external: {
          tenant_id: tenantId,
          external_id: externalId,
        },
      },
      select: { id: true },
    });

    if (!user) return null;

    await this.prisma.user.update({
      where: { id: user.id },
      data: { is_active: isActive },
    });

    if (!isActive) {
      const scheduled = await this.prisma.notification.findMany({
        where: {
          tenant_id: tenantId,
          user_id: user.id,
          status: notification_status.QUEUED,
          send_at: { not: null, gt: new Date() },
        },
        select: { id: true },
      });

      const idsToRemove = scheduled.map((n) => n.id);

      await this.prisma.notification.updateMany({
        where: { id: { in: idsToRemove } },
        data: { status: notification_status.CANCELED },
      });

      await this.removeNotifJobs(idsToRemove);

      await this.prisma.notification.updateMany({
        where: {
          user_id: user.id,
          status: {
            in: [notification_status.QUEUED, notification_status.SENDING],
          },
        },
        data: { status: notification_status.CANCELED },
      });
    }

    return true;
  }

  /**
   * Suppression définitive (hard delete)
   */
  async hardDeleteUser(externalId: string, tenantId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        uk_user_tenant_external: {
          tenant_id: tenantId,
          external_id: externalId,
        },
      },
      select: { id: true },
    });

    if (!user) return null;

    const queued = await this.prisma.notification.findMany({
      where: {
        tenant_id: tenantId,
        user_id: user.id,
        status: notification_status.QUEUED,
      },
      select: { id: true },
    });

    const idsToRemove = queued.map((n) => n.id);

    await this.removeNotifJobs(idsToRemove);

    await this.prisma.subscription.deleteMany({ where: { user_id: user.id } });
    await this.prisma.notification.deleteMany({ where: { user_id: user.id } });
    await this.prisma.user.delete({ where: { id: user.id } });

    return true;
  }

  private async removeNotifJobs(notificationIds: string[]) {
    for (const id of notificationIds) {
      try {
        const job = await this.notifQueue.getJob(id);
        if (job) await job.remove();
      } catch {
        // best effort: ignore
      }
    }
  }
}
