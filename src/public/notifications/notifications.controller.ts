// public/notifications/notifications.controller.ts
import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiKeyAuthGuard } from 'src/common/guards/api-key-auth.guard';
import { NotificationsService } from './notifications.service';
import * as createNotificationDto from './dto/create-notification.dto';
import * as requestWithTenant from 'src/common/types/request-with-tenant';

@ApiTags('Notifications')
@ApiHeader({
  name: 'x-api-key',
  description: 'Tenant API key',
  required: true,
})
@Controller('notifications')
@UseGuards(ApiKeyAuthGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create and send a notification immediately (MVP)' })
  @ApiResponse({ status: 201, description: 'Notification created and sent' })
  async create(
    @Body() dto: createNotificationDto.CreateNotificationDto,
    @Req() req: requestWithTenant.RequestWithTenant,
  ) {
    return this.service.createAndSend(dto, req.tenant.id);
  }
}
