import { IsString, IsEnum, IsOptional, IsNumber, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';
import { LotType } from '@ks-mes/types';

export class CreateLotDto {
  @IsString()
  lotNumber!: string;

  @IsEnum(['MATERIAL', 'WIP', 'PRODUCT'])
  lotType!: LotType;

  @IsOptional()
  @IsString()
  materialId?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  quantity!: number;

  @IsString()
  unit!: string;
}
