import { IsString, IsOptional, IsISO8601 } from 'class-validator';

export class QueryOeeDto {
  @IsString()
  machineId!: string;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}
