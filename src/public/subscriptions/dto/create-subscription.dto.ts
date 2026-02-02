import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { channel } from '@prisma/client';

export class CreateSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  userExternalId: string;

  @IsEnum(channel)
  channel: channel;

  @IsString()
  @IsNotEmpty()
  endpoint: string;

  @IsOptional()
  @IsObject()
  meta?: Record<string, any>;
}
