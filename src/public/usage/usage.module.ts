import { Module } from '@nestjs/common';
import { UsageCommonModule } from 'src/common/usage/usage-common.module';
import { PublicUsageController } from './usage.controller';

@Module({
  imports: [UsageCommonModule],
  controllers: [PublicUsageController],
})
export class PublicUsageModule {}
