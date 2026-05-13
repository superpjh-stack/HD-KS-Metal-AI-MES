import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ErrorCodes } from '../constants/error-codes';

/**
 * Standard error response envelope — design §8.2.
 *
 * All HTTP errors across every KS-MES service must use this shape.
 * The `requestId` is sourced from the `X-Request-Id` request header when
 * present; otherwise a fresh UUID is generated so every error is traceable.
 */
export interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
  requestId: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const requestId =
      (req.headers['x-request-id'] as string | undefined) ?? uuidv4();
    const timestamp = new Date().toISOString();

    let statusCode: number;
    let code: string;
    let message: string;
    let details: unknown;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const responseBody = exception.getResponse();

      if (typeof responseBody === 'string') {
        message = responseBody;
        code = this.codeFromStatus(statusCode);
      } else if (typeof responseBody === 'object' && responseBody !== null) {
        const body = responseBody as Record<string, unknown>;
        // NestJS ValidationPipe produces { message: string[], error: string }
        message = Array.isArray(body['message'])
          ? (body['message'] as string[]).join('; ')
          : String(body['message'] ?? exception.message);
        code =
          typeof body['code'] === 'string'
            ? body['code']
            : this.codeFromStatus(statusCode);
        details = Array.isArray(body['message']) ? body['message'] : undefined;
      } else {
        message = exception.message;
        code = this.codeFromStatus(statusCode);
      }
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      code = ErrorCodes.INTERNAL_ERROR;
      message = 'An unexpected error occurred';
      // Log unexpected errors with full stack
      this.logger.error(
        `Unhandled exception [${requestId}]`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorResponseBody = {
      error: { code, message, details },
      timestamp,
      requestId,
    };

    // Remove details key if undefined to keep response clean
    if (body.error.details === undefined) {
      delete body.error.details;
    }

    res.status(statusCode).json(body);
  }

  private codeFromStatus(status: number): string {
    switch (status) {
      case HttpStatus.UNAUTHORIZED:
        return ErrorCodes.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCodes.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCodes.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCodes.RESOURCE_CONFLICT;
      case HttpStatus.UNPROCESSABLE_ENTITY:
      case HttpStatus.BAD_REQUEST:
        return ErrorCodes.VALIDATION_ERROR;
      case HttpStatus.SERVICE_UNAVAILABLE:
        return ErrorCodes.IOT_TIMEOUT;
      default:
        return status >= 500
          ? ErrorCodes.INTERNAL_ERROR
          : ErrorCodes.VALIDATION_ERROR;
    }
  }
}
