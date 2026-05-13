import { IsOptional, IsString, IsEnum, IsDateString, IsBooleanString } from 'class-validator';
import { AlarmSeverity } from '@prisma/client';

export class QueryAlarmEventsDto {
  @IsOptional()
  @IsString()
  machineId?: string;

  @IsOptional()
  @IsEnum(AlarmSeverity)
  severity?: AlarmSeverity;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsBooleanString()
  unacknowledgedOnly?: string;
}
