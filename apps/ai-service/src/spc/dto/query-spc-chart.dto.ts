import { IsString, IsDateString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class QuerySpcChartDto {
  @IsString()
  machineId!: string;

  @IsString()
  channel!: string;

  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(10)
  sampleSize?: number;
}
