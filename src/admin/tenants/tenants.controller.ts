import {
  Body,
  Controller,
  Post,
  Get,
  Patch,
  Req,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiKeysService } from '../api_keys/api-keys.service';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

import { CreateTenantDto } from './dto/create-tenant.dto';
import { GetTenantsQueryDto } from './dto/get-tenants-query.dto';
import { UpdateTenantPlanDto } from './dto/update-tenant-plan.dto';
import { UpdateTenantEmailDto } from './dto/update-tenant-email.dto';
import { UpdateTenantSuspensionDto } from './dto/update-tenant-suspension.dto';

@ApiTags('Tenants')
@ApiBearerAuth()
@Controller('admin/tenants')
@UseGuards(JwtAuthGuard)
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly apiKeysService: ApiKeysService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Créer un tenant' })
  @ApiResponse({ status: 201, description: 'Tenant créé avec succès.' })
  @ApiResponse({ status: 409, description: 'Tenant déjà existant.' })
  async createTenant(@Body() dto: CreateTenantDto, @Req() req) {
    const adminUserId = (req.user as { sub: string }).sub;
    return this.tenantsService.createTenant(dto, adminUserId);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les tenants' })
  @ApiResponse({ status: 200, description: 'Tenants récupérés avec succès.' })
  @ApiResponse({ status: 404, description: 'Tenants non trouvés.' })
  async listTenants(@Query() query: GetTenantsQueryDto) {
    return this.tenantsService.listTenants(query);
  }

  @Get(':idOrEmail')
  @ApiOperation({ summary: 'Récupérer un tenant par ID ou email' })
  @ApiResponse({ status: 200, description: 'Tenant récupéré avec succès.' })
  @ApiResponse({ status: 404, description: 'Tenant non trouvé.' })
  async getTenant(@Param('idOrEmail') idOrEmail: string) {
    const where = idOrEmail.includes('@')
      ? { email: idOrEmail }
      : { id: idOrEmail };

    return await this.tenantsService.getTenant(where);
  }

  @Patch('/:email/update-plan')
  @ApiOperation({ summary: 'Changer le plan d’un tenant' })
  @ApiResponse({ status: 200, description: 'Plan du tenant mis à jour.' })
  @ApiResponse({ status: 404, description: 'Tenant non trouvé.' })
  @ApiResponse({ status: 409, description: 'Plan inchangé.' })
  async updateTenantPlanByEmail(
    @Param('email') email: string,
    @Body() dto: UpdateTenantPlanDto,
  ) {
    return await this.tenantsService.updateTenantPlan(email, dto);
  }

  @Patch('/:email/update-email')
  @ApiOperation({ summary: 'Changer l’email d’un tenant' })
  @ApiResponse({ status: 200, description: 'Email du tenant mis à jour.' })
  @ApiResponse({ status: 404, description: 'Tenant non trouvé.' })
  @ApiResponse({ status: 409, description: 'Mail inchangé.' })
  async updateTenantEmail(
    @Param('email') email: string,
    @Body() dto: UpdateTenantEmailDto,
  ) {
    return await this.tenantsService.updateTenantEmail(email, dto);
  }

  @Patch(':email/suspend')
  @ApiOperation({ summary: 'Suspendre ou réactiver un tenant' })
  @ApiResponse({ status: 200, description: 'Statut du tenant mis à jour.' })
  @ApiResponse({ status: 404, description: 'Tenant non trouvé.' })
  async updateTenantSuspension(
    @Param('email') email: string,
    @Body() dto: UpdateTenantSuspensionDto,
  ) {
    return this.tenantsService.updateTenantSuspension(email, dto);
  }
}
