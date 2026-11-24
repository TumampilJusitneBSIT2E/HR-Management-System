import { IsIn, IsOptional, IsString, Length } from 'class-validator';

export class DecideApprovalDto {
  @IsIn(['Approved', 'Rejected'])
  decision: 'Approved' | 'Rejected';

  @IsOptional()
  @IsString()
  @Length(0, 500)
  remarks?: string;
}
