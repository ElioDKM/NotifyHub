import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  console.log('DATABASE_URL?', process.env.DATABASE_URL);
  console.log('JWT_SECRET?', process.env.JWT_SECRET);

  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('NotifyHub API')
    .setDescription('Documentation de l’API Admin & Public de NotifyHub')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

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
