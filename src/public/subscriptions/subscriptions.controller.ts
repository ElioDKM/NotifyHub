// public/subscriptions/subscriptions.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { SubscriptionsService } from './subscriptions.service';
import * as requestWithTenant from '../../common/types/request-with-tenant';
import { ListSubscriptionsDto } from './dto/list-subscriptions.dto';
import { PublicApi } from 'src/common/decorators/api.decorator';

@ApiTags('Subscriptions')
@ApiHeader({
  name: 'x-api-key',
  description: 'Tenant API key',
  required: true,
})
@PublicApi()
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly service: SubscriptionsService) {}

  @Post()
  @ApiOperation({ summary: 'Crée une subscription pour un utilisateur' })
  @ApiResponse({ status: 201, description: 'Subscription créée' })
  @ApiResponse({
    status: 422,
    description: 'Utilisateur introuvable ou endpoint invalide',
  })
  async create(
    @Body() dto: CreateSubscriptionDto,
    @Req() req: requestWithTenant.RequestWithTenant,
  ) {
    return this.service.createForUser(dto, req.tenant.id);
  }

  @Get()
  @ApiOperation({ summary: 'Liste les subscriptions pour un utilisateur' })
  @ApiResponse({ status: 200, description: 'Liste des subscriptions' })
  async list(
    @Query() query: ListSubscriptionsDto,
    @Req() req: requestWithTenant.RequestWithTenant,
  ) {
    return this.service.listForUser(
      query.userExternalId,
      req.tenant.id,
      query.channel,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprime une subscription' })
  @ApiResponse({ status: 200, description: 'Subscription supprimée' })
  async delete(
    @Param('id') id: string,
    @Req() req: requestWithTenant.RequestWithTenant,
  ) {
    const deleted = await this.service.deleteForTenant(id, req.tenant.id);

    if (!deleted) {
      throw new NotFoundException('SubscriptionNotFound');
    }

    return { success: true };
  }
}
