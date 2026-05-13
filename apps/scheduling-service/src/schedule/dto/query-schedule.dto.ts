import { IsOptional, IsString, IsISO8601, IsEnum } from 'class-validator';

enum ScheduleStatusDto {
  PENDING     = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED   = 'COMPLETED',
  CANCELLED   = 'CANCELLED',
  ON_HOLD     = 'ON_HOLD',
}

export class QueryScheduleDto {
  @IsOptional()
  @IsString()
  machineId?: string;

  @IsOptional()
  @IsEnum(ScheduleStatusDto)
  status?: ScheduleStatusDto;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}
