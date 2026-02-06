import { Controller, Get, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsageService } from 'src/common/usage/usage.service';
import { PublicApi } from 'src/common/decorators/api.decorator';
import * as requestWithTenant from 'src/common/types/request-with-tenant';

@ApiTags('Usage')
@PublicApi()
@Controller('usage')
export class PublicUsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get()
  @ApiOperation({
    summary:
      "Récupère l'usage actuel du tenant (nombre de notifications envoyées ce mois-ci)",
  })
  @ApiResponse({ status: 200, description: 'Usage retourné' })
  async getMyUsage(@Req() req: requestWithTenant.RequestWithTenant) {
    const tenant = req.tenant;
    return this.usageService.getTenantUsage(tenant.id, tenant.plan);
  }
}
