import { IsOptional, IsString, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryPredictionsDto {
  @IsString()
  machineId!: string;

  @IsOptional()
  @IsIn(['AUTOENCODER', 'FAILURE_PROB', 'RUL'])
  modelType?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value as string, 10))
  limit?: number = 100;
}
