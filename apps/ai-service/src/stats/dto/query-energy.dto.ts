import { IsString, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryEnergyDto {
  @IsString()
  machineId!: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value as string, 10))
  hoursBack?: number = 24;
}
