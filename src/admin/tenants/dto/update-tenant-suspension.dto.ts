import { IsBoolean } from 'class-validator';

export class UpdateTenantSuspensionDto {
  @IsBoolean()
  isSuspended: boolean;
}
