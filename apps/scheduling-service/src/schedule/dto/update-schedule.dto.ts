import { IsString, IsInt, IsISO8601, IsOptional, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

enum ScheduleStatusDto {
  PENDING     = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED   = 'COMPLETED',
  CANCELLED   = 'CANCELLED',
  ON_HOLD     = 'ON_HOLD',
}

export class UpdateScheduleDto {
  @IsOptional()
  @IsEnum(ScheduleStatusDto)
  status?: ScheduleStatusDto;

  @IsOptional()
  @IsISO8601()
  actualStart?: string;

  @IsOptional()
  @IsISO8601()
  actualEnd?: string;

  @IsOptional()
  @IsISO8601()
  plannedStart?: string;

  @IsOptional()
  @IsISO8601()
  plannedEnd?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  priority?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
