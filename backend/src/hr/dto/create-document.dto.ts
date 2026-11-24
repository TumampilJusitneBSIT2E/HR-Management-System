import { IsString, Length } from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  @Length(1, 120)
  DocumentType: string;
}
