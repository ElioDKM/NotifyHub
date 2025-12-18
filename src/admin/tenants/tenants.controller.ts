import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('admin/tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async createTenant(@Body() dto: CreateTenantDto, @Req() req) {
    const adminUserId = (req.user as { sub: string }).sub;
    return this.tenantsService.createTenant(dto, adminUserId);
  }
}
