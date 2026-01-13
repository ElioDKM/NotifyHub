import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './admin/auth/auth.module';
import { TenantsModule } from './admin/tenants/tenants.module';
import { UsersModule } from './public/users/users.module';
import { ChannelConfigsModule } from './public/channels-configs/channel-configs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AuthModule,
    TenantsModule,
    UsersModule,
    ChannelConfigsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
