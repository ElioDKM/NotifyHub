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
    RedisModule,
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
