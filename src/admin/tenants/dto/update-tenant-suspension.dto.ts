import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTenantSuspensionDto {
  @ApiProperty({
    example: true,
    description: 'Statut de suspension du tenant',
  })
  @IsBoolean()
  isSuspended: boolean;
}
