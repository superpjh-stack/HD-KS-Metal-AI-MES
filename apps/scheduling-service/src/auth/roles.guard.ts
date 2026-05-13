import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@ks-mes/types';
import { ROLES_KEY } from './roles.decorator';
import { RequestUser } from './jwt.strategy';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user: RequestUser = context.switchToHttp().getRequest().user;
    if (!user?.roles?.some((r) => required.includes(r))) {
      throw new ForbiddenException('이 작업을 수행할 권한이 없습니다.');
    }
    return true;
  }
}
