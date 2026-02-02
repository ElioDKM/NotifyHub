// public/subscriptions/dto/list-subscriptions.dto.ts
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { channel } from '@prisma/client';

export class ListSubscriptionsDto {
  @IsString()
  @IsNotEmpty()
  userExternalId: string;

  @IsOptional()
  @IsEnum(channel)
  channel?: channel;
}
