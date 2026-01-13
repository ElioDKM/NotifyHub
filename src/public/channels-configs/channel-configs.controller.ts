// public/channel-configs/channel-configs.controller.ts
import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiKeyAuthGuard } from 'src/common/guards/api-key-auth.guard';
import { CreateChannelConfigDto } from './dto/create-channel-config.dto';
import { ChannelConfigsService } from './channel-configs.service';

export type TenantAuthContext = {
  id: string;
};

export type RequestWithTenant = {
  tenant: TenantAuthContext;
};

@ApiTags('Channel Configs')
@ApiHeader({
  name: 'x-api-key',
  description: 'Tenant API key',
  required: true,
})
@Controller('channel-configs')
@UseGuards(ApiKeyAuthGuard)
export class ChannelConfigsController {
  constructor(private readonly service: ChannelConfigsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a channel configuration for the current tenant',
  })
  @ApiResponse({ status: 201, description: 'Config created' })
  @ApiResponse({ status: 409, description: 'ConfigExists' })
  @ApiResponse({ status: 400, description: 'BadRequest' })
  async create(
    @Req() req: RequestWithTenant,
    @Body() dto: CreateChannelConfigDto,
  ) {
    const tenantId = req.tenant.id;
    return this.service.createForTenant(tenantId, dto);
  }
}
