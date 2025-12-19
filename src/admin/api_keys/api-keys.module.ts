import { Module } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { PrismaService } from 'prisma/prisma.service';
import { ApiKeysController } from './api-keys.controller';

@Module({
  controllers: [ApiKeysController],
  providers: [ApiKeysService, PrismaService],
  exports: [ApiKeysService],
})
export class ApiKeysModule {}
