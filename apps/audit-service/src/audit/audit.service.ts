import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

const prisma = new PrismaClient();

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  async create(dto: CreateAuditLogDto): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId:       dto.userId,
          userEmail:    dto.userEmail,
          action:       dto.action,
          resourceType: dto.resourceType,
          resourceId:   dto.resourceId ?? null,
          beforeValue:  dto.beforeValue ?? undefined,
          afterValue:   dto.afterValue  ?? undefined,
          ipAddress:    dto.ipAddress   ?? null,
          userAgent:    dto.userAgent   ?? null,
          occurredAt:   new Date(dto.occurredAt),
        },
      });
    } catch (err) {
      this.logger.error('Failed to persist audit log', err);
    }
  }
}
