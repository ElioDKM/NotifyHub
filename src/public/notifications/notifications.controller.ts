// public/notifications/notifications.controller.ts
import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import * as createNotificationDto from './dto/create-notification.dto';
import * as listNotificationsDto from './dto/list-notifications.dto';
import * as requestWithTenant from 'src/common/types/request-with-tenant';
import { MonthlyQuotaGuard } from 'src/common/guards/monthly-quota.guard';
import { PublicApi } from 'src/common/decorators/api.decorator';
import { RescheduleNotificationDto } from './dto/reschedule-notification.dto';

@ApiTags('Notifications')
@ApiHeader({
  name: 'x-api-key',
  description: 'Tenant API key',
  required: true,
})
@PublicApi()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Post()
  @UseGuards(MonthlyQuotaGuard)
  @ApiOperation({ summary: 'Créer et envoyer une notification' })
  @ApiResponse({ status: 201, description: 'Notification créée et envoyée' })
  async create(
    @Body() dto: createNotificationDto.CreateNotificationDto,
    @Req() req: requestWithTenant.RequestWithTenant,
  ) {
    return this.service.createAndSend(dto, req.tenant.id);
  }

  @Get()
  @ApiOperation({
    summary: 'Liste des notifications avec filtres et pagination',
  })
  @ApiResponse({ status: 200, description: 'Liste des notifications' })
  async list(
    @Req() req: requestWithTenant.RequestWithTenant,
    @Query() query: listNotificationsDto.ListNotificationsDto,
  ) {
    return this.service.listForTenant(req.tenant.id, query);
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Annuler une notification en attente (avant son exécution)',
  })
  @ApiResponse({ status: 200, description: 'Notification annulée' })
  @ApiResponse({ status: 404, description: 'Notification introuvable' })
  @ApiResponse({ status: 422, description: 'État invalide' })
  async cancel(
    @Param('id') id: string,
    @Req() req: requestWithTenant.RequestWithTenant,
  ) {
    const result = await this.service.cancelNotification(req.tenant.id, id);
    if (!result) throw new NotFoundException('Notification introuvable');
    return result;
  }

  @Patch(':id/reschedule')
  @ApiOperation({
    summary: 'Reprogrammer une notification en attente (avant son exécution)',
  })
  @ApiResponse({ status: 200, description: 'Notification reprogrammée' })
  @ApiResponse({ status: 404, description: 'Notification introuvable' })
  @ApiResponse({ status: 400, description: 'sendAt invalide' })
  @ApiResponse({ status: 403, description: 'PlanFeatureNotAvailable (FREE)' })
  @ApiResponse({
    status: 422,
    description: 'InvalidState / ScheduleHorizonExceeded',
  })
  async reschedule(
    @Param('id') id: string,
    @Body() body: RescheduleNotificationDto,
    @Req() req: requestWithTenant.RequestWithTenant,
  ) {
    const result = await this.service.rescheduleNotification(
      req.tenant.id,
      req.tenant.plan,
      id,
      body.sendAt,
    );

    if (!result) throw new NotFoundException('NotFound');
    return result;
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Recuperer les détails d’une notification (y compris statut et historique des envois)',
  })
  @ApiResponse({ status: 200, description: 'Détails de la notification' })
  @ApiResponse({ status: 404, description: 'Notification introuvable' })
  async getOne(
    @Param('id') id: string,
    @Req() req: requestWithTenant.RequestWithTenant,
  ) {
    const notif = await this.service.getNotificationDetail(req.tenant.id, id);
    if (!notif) throw new NotFoundException('NotFound');
    return notif;
  }
}
