import { IsString, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryOeeHistoryDto {
  @IsString()
  machineId!: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value as string, 10))
  days?: number = 7;
}
