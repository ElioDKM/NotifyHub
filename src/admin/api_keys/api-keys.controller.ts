import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiKeysService } from './api-keys.service';
import { PrismaService } from 'prisma/prisma.service';

@Controller('admin/tenants/:tenantEmail/api-keys')
@UseGuards(JwtAuthGuard)
export class ApiKeysController {
  constructor(
    private readonly apiKeysService: ApiKeysService,
    private readonly prisma: PrismaService,
  ) {}

  // Création clé API
  @Post()
  async createApiKey(@Param('tenantEmail') tenantEmail: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { email: tenantEmail },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const newKey = await this.apiKeysService.generateForTenant(tenant.email);

    return {
      id: newKey.id,
      key: newKey.key,
      isActive: newKey.is_active,
      createdAt: newKey.created_at,
    };
  }

  // Liste les clés d’un tenant
  @Get()
  async getTenantKeys(@Param('tenantEmail') tenantEmail: string) {
    const keys = await this.apiKeysService.listTenantKeys(tenantEmail);
    if (!keys.length)
      throw new NotFoundException('No API keys found for this tenant');
    return keys;
  }

  // Désactivation d'une clé API
  @Patch(':keyIdOrMode/deactivate')
  async deactivateKey(
    @Param('tenantEmail') tenantEmail: string,
    @Param('keyIdOrMode') keyIdOrMode: string,
  ) {
    return await this.apiKeysService.updateKeyStatusByMode(
      tenantEmail,
      keyIdOrMode,
      false,
    );
  }

  // Réactiver une clé API
  @Patch(':keyIdOrMode/reactivate')
  async reactivateKey(
    @Param('tenantEmail') tenantEmail: string,
    @Param('keyIdOrMode') keyIdOrMode: string,
  ) {
    return await this.apiKeysService.updateKeyStatusByMode(
      tenantEmail,
      keyIdOrMode,
      true,
    );
  }
}
