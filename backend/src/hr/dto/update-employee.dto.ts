import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  FirstName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  LastName?: string;

  @IsOptional()
  @IsEmail()
  @Length(1, 254)
  Email?: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  Position?: string;
}
