import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { channel, recipient_mode } from '@prisma/client';

/* ---------- Base ---------- */

export class BaseNotificationDto {
  @ApiProperty({
    enum: channel,
    example: 'email',
    description: 'Canal de diffusion de la notification',
  })
  @IsEnum(channel)
  channel: channel;

  @ApiPropertyOptional({
    example: 'Bienvenue sur NotifyHub',
    description: 'Sujet de la notification, utile notamment pour les emails',
  })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({
    example: {
      title: 'Bienvenue',
      message: 'Votre compte a bien été créé',
    },
    description: 'Contenu dynamique de la notification',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  content: Record<string, unknown>;

  @ApiPropertyOptional({
    example: '2025-07-15T10:30:00.000Z',
    description: 'Date d’envoi programmée au format ISO 8601',
  })
  @IsOptional()
  @IsISO8601()
  sendAt?: string;
}

/* ---------- BY_USER ---------- */

export class NotificationByUserDto extends BaseNotificationDto {
  @ApiProperty({
    enum: recipient_mode,
    example: 'BY_USER',
    description: 'Mode de ciblage par utilisateur existant',
  })
  @IsEnum(recipient_mode)
  recipientMode: recipient_mode;

  @ApiProperty({
    example: 'user_123',
    description: 'Identifiant externe de l’utilisateur cible',
  })
  @IsString()
  @IsNotEmpty()
  userExternalId: string;
}

/* ---------- INLINE ---------- */

export class NotificationInlineDto extends BaseNotificationDto {
  @ApiProperty({
    enum: recipient_mode,
    example: 'INLINE',
    description:
      'Mode de ciblage direct avec une destination fournie dans la requête',
  })
  @IsEnum(recipient_mode)
  recipientMode: recipient_mode;

  @ApiProperty({
    example: 'john.doe@email.com',
    description: 'Destinataire direct de la notification',
  })
  @IsString()
  @IsNotEmpty()
  to: string;
}

export type CreateNotificationDto =
  | NotificationByUserDto
  | NotificationInlineDto;
