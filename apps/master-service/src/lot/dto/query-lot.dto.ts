import { IsOptional, IsString, IsEnum } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { LotStatus, LotType } from '@ks-mes/types';

export class QueryLotDto extends PaginationDto {
  @IsOptional()
  @IsString()
  lotNumber?: string;

  @IsOptional()
  @IsEnum(['MATERIAL', 'WIP', 'PRODUCT'])
  lotType?: LotType;

  @IsOptional()
  @IsEnum(['ACTIVE', 'USED', 'REJECTED', 'SHIPPED'])
  status?: LotStatus;

  @IsOptional()
  @IsString()
  supplierId?: string;
}
