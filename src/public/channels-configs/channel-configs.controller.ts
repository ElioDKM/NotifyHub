// public/channel-configs/channel-configs.controller.ts
import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiKeyAuthGuard } from 'src/common/guards/api-key-auth.guard';
import {
  CreateChannelConfigDto,
  ListChannelConfigsDto,
} from './dto/create-channel-config.dto';
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
    summary: 'Crée une configuration de canal pour le tenant courant',
  })
  @ApiResponse({ status: 201, description: 'Config créée' })
  @ApiResponse({ status: 409, description: 'Config déjà existante' })
  @ApiResponse({ status: 400, description: 'Mauvaise requête' })
  async create(
    @Req() req: RequestWithTenant,
    @Body() dto: CreateChannelConfigDto,
  ) {
    const tenantId = req.tenant.id;
    return this.service.createForTenant(tenantId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Liste les configurations de canaux pour le tenant courant',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des configurations de canaux récupérée',
  })
  async list(
    @Req() req: RequestWithTenant,
    @Query() query: ListChannelConfigsDto,
  ) {
    return this.service.listForTenant(req.tenant.id, query);
  }
}
