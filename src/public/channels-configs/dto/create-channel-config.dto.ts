import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export enum ChannelDto {
  EMAIL = 'EMAIL',
  EXPO_PUSH = 'EXPO_PUSH',
}

export class EmailConfigDto {
  @IsString()
  @IsNotEmpty()
  smtpHost!: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  smtpPort!: number;

  @IsOptional()
  @IsString()
  user?: string;

  @IsOptional()
  @IsString()
  pass?: string;

  @IsString()
  @IsNotEmpty()
  from!: string;
}

export class ExpoPushConfigDto {
  @IsString()
  @IsNotEmpty()
  projectId!: string;
}

export class CreateChannelConfigDto {
  @IsEnum(ChannelDto)
  channel!: ChannelDto;

  // Config EMAIL
  @ValidateIf((dto) => dto.channel === ChannelDto.EMAIL)
  @IsObject()
  email!: EmailConfigDto;

  // Config EXPO
  @ValidateIf((dto) => dto.channel === ChannelDto.EXPO_PUSH)
  @IsObject()
  expoPush!: ExpoPushConfigDto;

  @IsOptional()
  @IsBoolean()
  allowOverrides?: boolean;
}

export class ListChannelConfigsDto {
  @IsOptional()
  @IsEnum(ChannelDto)
  channel?: ChannelDto;
}
