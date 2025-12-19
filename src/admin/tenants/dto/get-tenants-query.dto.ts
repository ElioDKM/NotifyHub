import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { plan } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class GetTenantsQueryDto {
  @ApiProperty({
    example: 'PRO',
    enum: ['FREE', 'PRO', 'ULTRA'],
    description: 'Type de plan du tenant',
  })
  @IsOptional()
  @IsEnum(plan)
  plan?: plan;

  @ApiProperty({
    example: 'client@notifyhub.io',
    description: 'Email unique du tenant',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiProperty({
    example: '1',
    description: 'Numéro de page',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    example: '10',
    description: 'Nombre d’éléments par page',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pageSize?: number = 10;
}
