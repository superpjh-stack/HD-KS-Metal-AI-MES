/**
 * Canonical error codes — §8.1 표준 에러 코드 (ai-mes-foundation.design.md).
 * Appears in the `error.code` field of every HTTP error response.
 */
export const ErrorCodes = {
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  TOKEN_EXPIRED:    'TOKEN_EXPIRED',
  UNAUTHORIZED:     'UNAUTHORIZED',
  FORBIDDEN:        'FORBIDDEN',
  NOT_FOUND:        'NOT_FOUND',
  DUPLICATE_LOT:    'DUPLICATE_LOT',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR:   'INTERNAL_ERROR',
  IOT_TIMEOUT:      'IOT_TIMEOUT',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
