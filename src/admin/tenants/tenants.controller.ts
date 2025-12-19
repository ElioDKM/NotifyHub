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

import { CreateTenantDto } from './dto/create-tenant.dto';
import { GetTenantsQueryDto } from './dto/get-tenants-query.dto';
import { UpdateTenantPlanDto } from './dto/update-tenant-plan.dto';
import { UpdateTenantEmailDto } from './dto/update-tenant-email.dto';
import { UpdateTenantSuspensionDto } from './dto/update-tenant-suspension.dto';

@Controller('admin/tenants')
@UseGuards(JwtAuthGuard)
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly apiKeysService: ApiKeysService,
  ) {}

  @Post()
  async createTenant(@Body() dto: CreateTenantDto, @Req() req) {
    const adminUserId = (req.user as { sub: string }).sub;
    return this.tenantsService.createTenant(dto, adminUserId);
  }

  @Get()
  async listTenants(@Query() query: GetTenantsQueryDto) {
    return this.tenantsService.listTenants(query);
  }

  @Get(':idOrEmail')
  async getTenant(@Param('idOrEmail') idOrEmail: string) {
    const where = idOrEmail.includes('@')
      ? { email: idOrEmail }
      : { id: idOrEmail };

    return await this.tenantsService.getTenant(where);
  }

  @Patch('/:email/update-plan')
  async updateTenantPlanByEmail(
    @Param('email') email: string,
    @Body() dto: UpdateTenantPlanDto,
  ) {
    return await this.tenantsService.updateTenantPlan(email, dto);
  }

  @Patch('/:email/update-email')
  async updateTenantEmail(
    @Param('email') email: string,
    @Body() dto: UpdateTenantEmailDto,
  ) {
    return await this.tenantsService.updateTenantEmail(email, dto);
  }

  @Post(':email/api-keys')
  async createApiKeyForTenant(@Param('email') email: string) {
    return await this.apiKeysService.generateForTenant(email);
  }

  @Patch(':email/suspend')
  async updateTenantSuspension(
    @Param('email') email: string,
    @Body() dto: UpdateTenantSuspensionDto,
  ) {
    return this.tenantsService.updateTenantSuspension(email, dto);
  }
}
