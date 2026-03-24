import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

import { AuthModule } from './admin/auth/auth.module';
import { TenantsModule } from './admin/tenants/tenants.module';
import { UsersModule } from './public/users/users.module';
import { ChannelConfigsModule } from './public/channels-configs/channel-configs.module';
import { SubscriptionsModule } from './public/subscriptions/subscriptions.module';
import { NotificationModule } from './public/notifications/notifications.module';
import { RedisModule } from './common/redis/redis.module';
import { HealthModule } from './health/health.module';
import { AdminUsageModule } from './admin/usage/admin-usage.module';
import { PublicUsageModule } from './public/usage/usage.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT || 6379),
      },
    }),
    RedisModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    ChannelConfigsModule,
    SubscriptionsModule,
    NotificationModule,
    AdminUsageModule,
    PublicUsageModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
