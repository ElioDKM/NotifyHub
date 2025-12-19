import { IsEnum, IsNotEmpty } from 'class-validator';
import { plan } from '@prisma/client';

export class UpdateTenantPlanDto {
  @IsEnum(plan, { message: 'Invalid plan type. Must be FREE, PRO or ULTRA.' })
  @IsNotEmpty()
  plan: plan;
}
