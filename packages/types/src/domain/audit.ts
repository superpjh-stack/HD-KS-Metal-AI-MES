export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT';

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  beforeValue?: Record<string, unknown>;
  afterValue?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  occurredAt: Date;
}
