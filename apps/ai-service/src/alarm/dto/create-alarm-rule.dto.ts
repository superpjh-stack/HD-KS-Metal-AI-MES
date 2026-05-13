import {
  IsString, IsEnum, IsOptional, IsNumber, IsBoolean, Min, Max,
} from 'class-validator';
import { AlarmRuleType, AlarmSeverity } from '@prisma/client';

export class CreateAlarmRuleDto {
  @IsString()
  machineId!: string;

  @IsString()
  channel!: string;

  @IsEnum(AlarmRuleType)
  ruleType!: AlarmRuleType;

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
