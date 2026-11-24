import { IsDateString, IsInt, IsOptional, IsString, Length, Matches, Min } from 'class-validator';

export class UpdateLeaveRequestDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  LeaveTypeID?: number;

  @IsOptional()
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  StartDate?: string;

  @IsOptional()
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  EndDate?: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  Reason?: string;

  @IsOptional()
  @IsString()
  @Length(1, 2048)
  DocumentURL?: string;
}
