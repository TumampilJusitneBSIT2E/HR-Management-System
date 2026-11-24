import { IsDateString, IsInt, IsOptional, IsString, Length, Matches, Min } from 'class-validator';

export class CreateLeaveRequestDto {
  @IsInt()
  @Min(1)
  LeaveTypeID: number;

  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  StartDate: string;

  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  EndDate: string;

  @IsString()
  @Length(1, 500)
  Reason: string;

  @IsOptional()
  @IsString()
  @Length(1, 2048)
  DocumentURL?: string;
}
