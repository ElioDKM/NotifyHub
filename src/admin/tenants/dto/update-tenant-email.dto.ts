import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTenantEmailDto {
  @ApiProperty({
    example: 'newemail@notifyhub.io',
    description: 'Nouvel email du tenant',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty()
  newEmail: string;
}
