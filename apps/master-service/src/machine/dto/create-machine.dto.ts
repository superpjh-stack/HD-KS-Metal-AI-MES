import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateMachineDto {
  @IsString()
  machineCode!: string;

  @IsString()
  name!: string;

  @IsString()
  machineType!: string;

  @IsOptional()
  @IsString()
  lineId?: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  plcAddress?: string;

  @IsOptional()
  @IsDateString()
  installedAt?: string;
}

export class UpdateMachineDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  plcAddress?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  lineId?: string;
}
