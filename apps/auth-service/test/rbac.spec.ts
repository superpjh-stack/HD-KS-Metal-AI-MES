import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../src/guards/roles.guard';
import { JwtAuthGuard } from '../src/guards/jwt-auth.guard';

function makeContext(user: any, requiredRoles: string[] | undefined) {
  const reflector = new Reflector();
  jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);
  const context = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as any;
  return { guard: new RolesGuard(reflector), context };
}

describe('RolesGuard', () => {
  describe('no @Roles() decorator', () => {
    it('passes any authenticated user when no roles are required', () => {
      const user = { id: 'u1', email: 'op@test.com', name: 'Op', roles: ['OPERATOR'] };
      const { guard, context } = makeContext(user, undefined);
      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe('ADMIN role', () => {
    it('ADMIN can access admin-only endpoints', () => {
      const { guard, context } = makeContext({ id: 'u1', roles: ['ADMIN'] }, ['ADMIN']);
      expect(guard.canActivate(context)).toBe(true);
    });
    it('ADMIN can access manager-level endpoints', () => {
      const { guard, context } = makeContext({ id: 'u1', roles: ['ADMIN'] }, ['ADMIN', 'MANAGER']);
      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe('MANAGER role', () => {
    it('MANAGER can access manager+ endpoints', () => {
      const { guard, context } = makeContext({ id: 'u2', roles: ['MANAGER'] }, ['ADMIN', 'MANAGER']);
      expect(guard.canActivate(context)).toBe(true);
    });
    it('MANAGER is blocked from admin-only endpoints', () => {
      const { guard, context } = makeContext({ id: 'u2', roles: ['MANAGER'] }, ['ADMIN']);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('OPERATOR role', () => {
    it('OPERATOR can access operator-level endpoints', () => {
      const { guard, context } = makeContext({ id: 'u3', roles: ['OPERATOR'] }, ['ADMIN', 'MANAGER', 'OPERATOR']);
      expect(guard.canActivate(context)).toBe(true);
    });
    it('OPERATOR is blocked from manager-only endpoints', () => {
      const { guard, context } = makeContext({ id: 'u3', roles: ['OPERATOR'] }, ['ADMIN', 'MANAGER']);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
    it('OPERATOR is blocked from admin-only endpoints', () => {
      const { guard, context } = makeContext({ id: 'u3', roles: ['OPERATOR'] }, ['ADMIN']);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('VIEWER role', () => {
    it('VIEWER gets 403 on write-level endpoints', () => {
      const { guard, context } = makeContext({ id: 'u4', roles: ['VIEWER'] }, ['ADMIN', 'MANAGER', 'OPERATOR']);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
    it('VIEWER can access read-only endpoints with no role restriction', () => {
      const { guard, context } = makeContext({ id: 'u4', roles: ['VIEWER'] }, undefined);
      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe('missing user', () => {
    it('throws ForbiddenException when user is absent but roles are required', () => {
      const { guard, context } = makeContext(null, ['OPERATOR']);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });
});

describe('JwtAuthGuard — handleRequest', () => {
  let guard: JwtAuthGuard;
  beforeEach(() => {
    guard = new JwtAuthGuard(new Reflector());
  });
  it('returns user when auth succeeds', () => {
    const user = { id: 'u1', roles: ['OPERATOR'] };
    expect(guard.handleRequest(null, user)).toBe(user);
  });
  it('throws UnauthorizedException when user is falsy (401)', () => {
    expect(() => guard.handleRequest(null, null)).toThrow(UnauthorizedException);
  });
  it('throws UnauthorizedException on error (expired JWT)', () => {
    const err = new UnauthorizedException('Token expired');
    expect(() => guard.handleRequest(err, null)).toThrow(UnauthorizedException);
  });
});
