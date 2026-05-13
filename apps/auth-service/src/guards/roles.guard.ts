import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@ks-mes/types';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RequestUser } from '../auth/jwt.strategy';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user: RequestUser = request.user;

    if (!user?.roles?.some((role) => requiredRoles.includes(role))) {
      throw new ForbiddenException('이 작업을 수행할 권한이 없습니다.');
    }

    return true;
  }
}
