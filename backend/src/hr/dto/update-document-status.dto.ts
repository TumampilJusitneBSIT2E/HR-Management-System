import { IsIn } from 'class-validator';

export class UpdateDocumentStatusDto {
  @IsIn(['Verified', 'Rejected'])
  VerificationStatus: 'Verified' | 'Rejected';
}
