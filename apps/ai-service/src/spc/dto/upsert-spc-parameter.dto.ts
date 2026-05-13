import { IsString, IsOptional, IsNumber, IsInt, Min, Max } from 'class-validator';

export class UpsertSpcParameterDto {
  @IsString()
  machineId!: string;

  @IsString()
  channel!: string;

  @IsOptional()
  @IsNumber()
  usl?: number | null;

  @IsOptional()
  @IsNumber()
  lsl?: number | null;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(10)
  sampleSize?: number;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(100)
  sampleCount?: number;
}
