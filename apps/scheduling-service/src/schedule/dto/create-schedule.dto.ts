import { IsString, IsInt, IsISO8601, IsOptional, Min, Max, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateScheduleDto {
  @IsString()
  @IsNotEmpty()
  machineId: string;

  @IsString()
  @IsNotEmpty()
  productCode: string;

  @IsInt()
  @Min(1)
  plannedQty: number;

  @IsISO8601()
  plannedStart: string;

  @IsISO8601()
  plannedEnd: string;

  @IsOptional()
  @IsString()
  workOrderId?: string;

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
