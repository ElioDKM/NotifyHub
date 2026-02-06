import { Module } from '@nestjs/common';
import { UsageService } from 'src/common/usage/usage.service';
import { PublicUsageController } from 'src/public/usage/usage.controller';
import { AdminUsageController } from 'src/admin/usage/admin-usage.controller';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisModule } from 'src/common/redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [PublicUsageController, AdminUsageController],
  providers: [PrismaService, UsageService],
})
export class UsageModule {}
