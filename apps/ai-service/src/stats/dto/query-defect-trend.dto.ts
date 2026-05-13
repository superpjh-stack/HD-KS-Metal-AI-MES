import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryDefectTrendDto {
  @IsOptional()
  @IsString()
  machineId?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(90)
  days?: number = 30;
}
