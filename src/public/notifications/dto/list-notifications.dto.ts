import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { channel, notification_status } from '@prisma/client';

export class ListNotificationsDto {
  @IsOptional()
  @IsEnum(notification_status)
  @ApiPropertyOptional({ enum: notification_status })
  status?: notification_status;

  @IsOptional()
  @IsEnum(channel)
  @ApiPropertyOptional({ enum: channel })
  channel?: channel;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: "Nom de l'utilisateur" })
  userExternalId?: string;

  @IsOptional()
  @IsISO8601()
  @ApiPropertyOptional({ example: '2026-01-01T00:00:00Z' })
  from?: string;

  @IsOptional()
  @IsISO8601()
  @ApiPropertyOptional({ example: '2026-01-01T00:00:00Z' })
  to?: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({ example: 1, default: 1 })
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(100)
  @ApiPropertyOptional({ example: 20, default: 20, maximum: 100 })
  pageSize?: number = 20;
}
