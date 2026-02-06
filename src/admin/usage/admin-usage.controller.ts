import {
  Controller,
  Get,
  NotFoundException,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsageService } from 'src/common/usage/usage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from 'prisma/prisma.service';

@ApiTags('Admin - Usage')
@Controller('admin/tenants')
@UseGuards(JwtAuthGuard)
export class AdminUsageController {
  constructor(
    private readonly usageService: UsageService,
    private readonly prisma: PrismaService,
  ) {}

  // @UseGuards(AuthGuard('jwt')) // ✅ si tu utilises passport-jwt
  @Get(':email/usage')
  @ApiOperation({ summary: 'Get current usage for a tenant (admin only)' })
  @ApiResponse({ status: 200, description: 'Usage returned' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async getTenantUsage(@Param('email') tenantEmail: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { email: tenantEmail },
      select: { email: true, plan: true },
    });

    if (!tenant) throw new NotFoundException('Tenant not found');

    return this.usageService.getTenantUsage(tenant.email, tenant.plan);
  }
}
