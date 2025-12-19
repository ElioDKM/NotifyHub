import { IsEmail, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum PlanType {
  FREE = 'FREE',
  PRO = 'PRO',
  ULTRA = 'ULTRA',
}

export class CreateTenantDto {
  @ApiProperty({
    example: 'client@notifyhub.io',
    description: 'Email unique du tenant',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'PRO',
    enum: ['FREE', 'PRO', 'ULTRA'],
    description: 'Type de plan du tenant',
  })
  @IsEnum(PlanType)
  plan: PlanType;

  @ApiProperty({
    example: true,
    description: 'Générer une clé API automatiquement',
  })
  @IsOptional()
  @IsBoolean()
  issueApiKey?: boolean = false;
}
