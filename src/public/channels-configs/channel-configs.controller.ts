// public/channel-configs/channel-configs.controller.ts
import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  ChannelDto,
  CreateChannelConfigDto,
  ListChannelConfigsDto,
} from './dto/create-channel-config.dto';
import { ChannelConfigsService } from './channel-configs.service';
import { PublicApi } from 'src/common/decorators/api.decorator';
import { UpdateChannelConfigDto } from './dto/update-channel-config.dto';
import { channel as ChannelEnum } from '@prisma/client';

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
@PublicApi()
@Controller('channel-configs')
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

  @Patch(':channel')
  @ApiOperation({
    summary: 'Met à jour la configuration d’un canal pour le tenant courant',
  })
  @ApiResponse({ status: 200, description: 'Config mise à jour' })
  @ApiResponse({ status: 404, description: 'Config non trouvée' })
  async update(
    @Param('channel', new ParseEnumPipe(ChannelEnum)) channel: ChannelDto,
    @Body() dto: UpdateChannelConfigDto,
    @Req() req: RequestWithTenant,
  ) {
    const tenantId = req.tenant.id;

    const updated = await this.service.updateForTenant(tenantId, channel, dto);
    if (!updated) throw new NotFoundException('ConfigNotFound');
    return updated;
  }
}
