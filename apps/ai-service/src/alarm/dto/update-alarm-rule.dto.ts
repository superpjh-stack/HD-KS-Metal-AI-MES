import { IsNumber, IsBoolean, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { AlarmSeverity } from '@prisma/client';

export class UpdateAlarmRuleDto {
  @IsOptional()
  @IsNumber()
  threshold?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  sigmaFactor?: number;

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(1440)
  windowMin?: number;

  @IsOptional()
  @IsEnum(AlarmSeverity)
  severity?: AlarmSeverity;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
