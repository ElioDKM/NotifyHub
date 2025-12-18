import { IsEmail, IsOptional, IsEnum, IsBoolean } from 'class-validator';

export enum PlanType {
  FREE = 'FREE',
  PRO = 'PRO',
  ULTRA = 'ULTRA',
}

export class CreateTenantDto {
  @IsEmail()
  email: string;

  @IsEnum(PlanType)
  plan: PlanType;

  @IsOptional()
  @IsBoolean()
  issueApiKey?: boolean = false;
}
