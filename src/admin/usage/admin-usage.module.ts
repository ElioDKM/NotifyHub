import { Module } from '@nestjs/common';
import { AdminUsageController } from './admin-usage.controller';
import { UsageCommonModule } from 'src/common/usage/usage-common.module';

@Module({
  imports: [UsageCommonModule],
  controllers: [AdminUsageController],
})
export class AdminUsageModule {}
