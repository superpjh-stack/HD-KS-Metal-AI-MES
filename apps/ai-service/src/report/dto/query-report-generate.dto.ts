import { IsDateString, IsIn, IsOptional } from 'class-validator';

export class QueryReportGenerateDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;

  @IsOptional()
  @IsIn(['pdf'])
  format?: string = 'pdf';
}
