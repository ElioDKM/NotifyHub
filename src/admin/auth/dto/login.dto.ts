import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'admin@notifyhub.io',
    description: "Email de l'administrateur",
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'strongpassword123',
    description: "Mot de passe de l'administrateur",
  })
  @IsString()
  @MinLength(6)
  password: string;
}
