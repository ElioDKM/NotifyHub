import { Module } from '@nestjs/common';
import { ChannelConfigsController } from './channel-configs.controller';
import { ChannelConfigsService } from './channel-configs.service';
import { PrismaService } from '../../../prisma/prisma.service';

@Module({
  controllers: [ChannelConfigsController],
  providers: [ChannelConfigsService, PrismaService],
  exports: [ChannelConfigsService],
})
export class ChannelConfigsModule {}
