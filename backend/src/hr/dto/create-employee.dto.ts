import { IsEmail, IsIn, IsInt, IsString, Length, Matches, Min } from 'class-validator';

export class CreateEmployeeDto {
  @IsInt()
  @Min(1)
  DepartmentID: number;

  @IsString()
  @Length(1, 100)
  FirstName: string;

  @IsString()
  @Length(1, 100)
  LastName: string;

  @IsEmail()
  @Length(1, 254)
  Email: string;

  @IsIn(['Employee', 'DepartmentHead', 'HRManager'])
  Role: 'Employee' | 'DepartmentHead' | 'HRManager';

  @IsString()
  @Length(1, 120)
  Position: string;

  @IsString()
  @Length(12, 128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/, {
    message: 'Initial password must include lowercase, uppercase, numeric, and special characters.',
  })
  InitialPassword: string;
}
