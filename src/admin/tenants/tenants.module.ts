import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ApiKeysModule } from '../api_keys/api-keys.module';

@Module({
  imports: [ApiKeysModule],
  controllers: [TenantsController],
  providers: [TenantsService, PrismaService],
})
export class TenantsModule {}
