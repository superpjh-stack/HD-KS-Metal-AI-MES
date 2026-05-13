import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuditService } from './audit.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * POST /api/v1/audit/logs
   * Receives an audit event from any service and persists it INSERT-ONLY.
   * Returns 204 No Content on success — callers should fire-and-forget.
   */
  @Post('logs')
  @HttpCode(HttpStatus.NO_CONTENT)
  async create(@Body() dto: CreateAuditLogDto): Promise<void> {
    await this.auditService.create(dto);
  }
}
