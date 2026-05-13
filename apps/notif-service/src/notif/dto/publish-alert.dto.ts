import { IsEnum, IsString, IsOptional } from 'class-validator';

export type AlertLevel = 'info' | 'warning' | 'critical';

export class PublishAlertDto {
  @IsEnum(['info', 'warning', 'critical'])
  level!: AlertLevel;

  @IsString()
  title!: string;

  @IsString()
  message!: string;

  @IsOptional()
  @IsString()
  machineCode?: string;

  @IsOptional()
  @IsString()
  lotId?: string;
}
