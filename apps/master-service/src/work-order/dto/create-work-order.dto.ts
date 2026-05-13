import { IsString, IsInt, IsPositive, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { WOStatus } from '@ks-mes/types';

export class CreateWorkOrderDto {
  @IsString()
  woNumber!: string;

  @IsString()
  productCode!: string;

  @IsString()
  machineId!: string;

  @IsInt()
  @IsPositive()
  @Type(() => Number)
  plannedQty!: number;

  @IsOptional()
  @IsString()
  moldId?: string;

  @IsOptional()
  @IsString()
  operatorId?: string;

  @IsOptional()
  @IsDateString()
  plannedStart?: string;

  @IsOptional()
  @IsDateString()
  plannedEnd?: string;
}

export class UpdateWorkOrderDto {
  @IsOptional()
  @IsEnum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD'])
  status?: WOStatus;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  producedQty?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  defectQty?: number;

  @IsOptional()
  @IsString()
  operatorId?: string;

  @IsOptional()
  @IsDateString()
  actualStart?: string;

  @IsOptional()
  @IsDateString()
  actualEnd?: string;
}
