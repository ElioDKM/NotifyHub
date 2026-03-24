import { Module } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisModule } from 'src/common/redis/redis.module';
import { UsageService } from 'src/common/usage/usage.service';

@Module({
  imports: [RedisModule],
  providers: [PrismaService, UsageService],
  exports: [PrismaService, UsageService],
})
export class UsageCommonModule {}
