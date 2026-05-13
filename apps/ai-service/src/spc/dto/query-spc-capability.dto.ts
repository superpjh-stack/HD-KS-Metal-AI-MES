import { IsString } from 'class-validator';

export class QuerySpcCapabilityDto {
  @IsString()
  machineId!: string;
}
