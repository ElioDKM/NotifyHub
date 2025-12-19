import { IsEnum, IsNotEmpty } from 'class-validator';
import { plan } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTenantPlanDto {
  @ApiProperty({
    example: 'PRO',
    enum: ['FREE', 'PRO', 'ULTRA'],
    description: 'Type de plan du tenant',
  })
  @IsEnum(plan, { message: 'Invalid plan type. Must be FREE, PRO or ULTRA.' })
  @IsNotEmpty()
  plan: plan;
}
