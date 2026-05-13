import { IsString, IsOptional, IsInt, IsISO8601, IsObject, Min, Max, IsEmail } from 'class-validator';

export class CreateAuditLogDto {
  @IsString()
  userId!: string;

  @IsEmail()
  userEmail!: string;

  /** e.g. "POST /lots", "PATCH /machines/abc" */
  @IsString()
  action!: string;

  /** e.g. "lots", "machines", "auth" */
  @IsString()
  resourceType!: string;

  @IsOptional()
  @IsString()
  resourceId?: string;

  /** { role, requestId, body } */
  @IsOptional()
  @IsObject()
  beforeValue?: Record<string, unknown>;

  /** { statusCode } */
  @IsOptional()
  @IsObject()
  afterValue?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsISO8601()
  occurredAt!: string;
}
