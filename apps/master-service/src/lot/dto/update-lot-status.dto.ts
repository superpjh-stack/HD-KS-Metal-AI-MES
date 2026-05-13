import { IsEnum } from 'class-validator';
import { LotStatus } from '@ks-mes/types';

export class UpdateLotStatusDto {
  @IsEnum(['ACTIVE', 'USED', 'REJECTED', 'SHIPPED'])
  status!: LotStatus;
}
