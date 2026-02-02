import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { EmailSender } from './senders/email.sender';
import { ExpoSender } from './senders/expo.sender';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsProcessor } from './notifications.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'notifications',
    }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsProcessor,
    EmailSender,
    ExpoSender,
    PrismaService,
  ],
  exports: [NotificationsService],
})
export class NotificationModule {}
