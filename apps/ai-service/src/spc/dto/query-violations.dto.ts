import { IsString, IsDateString, IsOptional } from 'class-validator';

export class QueryViolationsDto {
  @IsString()
  machineId!: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
