import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import type { Request, Response } from 'express';

const SANITIZE_KEYS = new Set([
  'password', 'passwordConfirm', 'currentPassword', 'newPassword',
  'token', 'refreshToken', 'accessToken', 'secret', 'creditCard',
]);

function sanitizeBody(body: unknown): Record<string, unknown> {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return {};
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    result[k] = SANITIZE_KEYS.has(k) ? '[REDACTED]' : v;
  }
  return result;
}

function parseResource(path: string): { resourceType: string; resourceId?: string } {
  const segments = path.replace(/^\/api\/v\d+\//, '').split('/').filter(Boolean);
  return { resourceType: segments[0] ?? 'unknown', resourceId: segments[1] };
}

export interface AuditEventPayload {
  userId: string;
  userEmail: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  beforeValue?: Record<string, unknown>;
  afterValue?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  occurredAt: string;
}

interface AuditUser {
  id?: string;
  email?: string;
  role?: string;
  roles?: string[];
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly auditServiceUrl: string =
      process.env.AUDIT_SERVICE_URL ?? 'http://localhost:3004/api/v1',
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req  = http.getRequest<Request & { user?: AuditUser }>();
    const res  = http.getResponse<Response>();

    const requestId = (req.headers['x-request-id'] as string | undefined) ?? uuidv4();
    res.setHeader('x-request-id', requestId);

    const user   = req.user;
    const userId = user?.id    ?? 'anonymous';
    const email  = user?.email ?? 'unknown@system';
    const role   = user?.role ?? (user?.roles?.[0] ?? 'NONE');
    const { resourceType, resourceId } = parseResource(req.path);

    return next.handle().pipe(
      tap(() => {
        const payload: AuditEventPayload = {
          userId,
          userEmail:    email,
          action:       `${req.method.toUpperCase()} ${req.path}`,
          resourceType,
          resourceId,
          beforeValue:  { role, requestId, body: sanitizeBody(req.body) },
          afterValue:   { statusCode: res.statusCode },
          ipAddress:    req.ip,
          userAgent:    req.headers['user-agent'],
          occurredAt:   new Date().toISOString(),
        };

        fetch(`${this.auditServiceUrl}/audit/logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch((err: unknown) => {
          this.logger.warn('Audit event delivery failed', err);
        });
      }),
    );
  }
}
