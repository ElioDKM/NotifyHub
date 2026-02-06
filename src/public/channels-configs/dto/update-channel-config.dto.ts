import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class UpdateEmailConfigDto {
  @IsOptional() @IsString() smtpHost?: string;
  @IsOptional() @IsNumber() smtpPort?: number;
  @IsOptional() @IsString() user?: string;
  @IsOptional() @IsString() pass?: string;
  @IsOptional() @IsString() from?: string;
}

class UpdateExpoPushConfigDto {
  @IsOptional() @IsString() projectId?: string;
}

export class UpdateChannelConfigDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateEmailConfigDto)
  email?: UpdateEmailConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateExpoPushConfigDto)
  expoPush?: UpdateExpoPushConfigDto;

  @IsOptional()
  @IsBoolean()
  allowOverrides?: boolean;
}
