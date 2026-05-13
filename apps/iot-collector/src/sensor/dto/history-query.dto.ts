import { IsDateString, IsOptional, IsString } from 'class-validator';

export class HistoryQueryDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;

  @IsOptional()
  @IsString()
  channel?: string;
}
