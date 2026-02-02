import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { channel, recipient_mode } from '@prisma/client';

/* ---------- Base ---------- */

export class BaseNotificationDto {
  @IsEnum(channel)
  channel: channel;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsObject()
  content: Record<string, unknown>;

  @IsOptional()
  @IsISO8601()
  sendAt?: string;
}

/* ---------- BY_USER ---------- */

export class NotificationByUserDto extends BaseNotificationDto {
  @IsEnum(recipient_mode)
  recipientMode: recipient_mode;

  @IsString()
  @IsNotEmpty()
  userExternalId: string;
}

/* ---------- INLINE ---------- */

export class NotificationInlineDto extends BaseNotificationDto {
  @IsEnum(recipient_mode)
  recipientMode: recipient_mode;

  @IsString()
  @IsNotEmpty()
  to: string;
}

export type CreateNotificationDto =
  | NotificationByUserDto
  | NotificationInlineDto;
