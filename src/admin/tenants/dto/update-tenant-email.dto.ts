import { IsEmail, IsNotEmpty } from 'class-validator';

export class UpdateTenantEmailDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty()
  newEmail: string;
}
