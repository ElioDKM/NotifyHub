import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import { AuthModule } from './admin/auth/auth.module';
import { TenantsModule } from './admin/tenants/tenants.module';
import { ApiKeysModule } from './admin/api_keys/api-keys.module';

import { UsersModule } from './public/users/users.module';
import { ChannelConfigsModule } from './public/channels-configs/channel-configs.module';
import { SubscriptionsModule } from './public/subscriptions/subscriptions.module';
import { NotificationModule } from './public/notifications/notifications.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  const adminConfig = new DocumentBuilder()
    .setTitle('NotifyHub – Admin API')
    .setDescription('Administration endpoints')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'admin-jwt',
    )
    .build();

  const adminDocument = SwaggerModule.createDocument(app, adminConfig, {
    include: [AuthModule, TenantsModule, ApiKeysModule],
  });

  SwaggerModule.setup('docs/admin', app, adminDocument);

  const publicConfig = new DocumentBuilder()
    .setTitle('NotifyHub – Public API')
    .setDescription('Tenant API (API Key auth)')
    .setVersion('1.0')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header',
      },
      'api-key',
    )
    .build();

  const publicDocument = SwaggerModule.createDocument(app, publicConfig, {
    include: [
      UsersModule,
      ChannelConfigsModule,
      SubscriptionsModule,
      NotificationModule,
    ],
  });

  SwaggerModule.setup('docs/public', app, publicDocument);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT || 3000);
  console.log('🚀 Server is running on http://localhost:3000');
}
void bootstrap();
