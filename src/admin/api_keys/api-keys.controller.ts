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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('API Keys')
@ApiBearerAuth()
@Controller('admin/tenants/:tenantEmail/api-keys')
@UseGuards(JwtAuthGuard)
export class ApiKeysController {
  constructor(
    private readonly apiKeysService: ApiKeysService,
    private readonly prisma: PrismaService,
  ) {}

  // Création clé API
  @Post()
  @ApiOperation({ summary: 'Générer une clé API pour un tenant' })
  @ApiResponse({ status: 201, description: 'Clé API générée avec succès.' })
  @ApiResponse({ status: 404, description: 'Tenant non trouvé.' })
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
  @ApiOperation({ summary: 'Lister les clés API d’un tenant' })
  @ApiResponse({ status: 200, description: 'Clés API récupérées avec succès.' })
  @ApiResponse({ status: 404, description: 'Tenant non trouvé.' })
  async getTenantKeys(@Param('tenantEmail') tenantEmail: string) {
    const keys = await this.apiKeysService.listTenantKeys(tenantEmail);
    if (!keys.length)
      throw new NotFoundException('No API keys found for this tenant');
    return keys;
  }

  // Désactivation d'une clé API
  @Patch(':keyIdOrMode/deactivate')
  @ApiOperation({ summary: 'Désactiver une clé API' })
  @ApiResponse({ status: 200, description: 'Clé API désactivée avec succès.' })
  @ApiResponse({ status: 404, description: 'Tenant non trouvé.' })
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
  @ApiOperation({ summary: 'Réactiver une clé API' })
  @ApiResponse({ status: 200, description: 'Clé API réactivée avec succès.' })
  @ApiResponse({ status: 404, description: 'Tenant non trouvé.' })
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
