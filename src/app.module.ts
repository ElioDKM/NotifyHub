import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './admin/auth/auth.module';
import { TenantsModule } from './admin/tenants/tenants.module';
import { UsersModule } from './public/users/users.module';
import { ChannelConfigsModule } from './public/channels-configs/channel-configs.module';
import { SubscriptionsModule } from './public/subscriptions/subscriptions.module';
import { NotificationModule } from './public/notifications/notifications.module';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    BullModule.forRoot({
      connection: {
        host: '127.0.0.1',
        port: 6379,
      },
    }),
    AuthModule,
    TenantsModule,
    UsersModule,
    ChannelConfigsModule,
    SubscriptionsModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
