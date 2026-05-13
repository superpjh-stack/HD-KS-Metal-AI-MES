import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestUser } from './jwt.strategy';

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): RequestUser => ctx.switchToHttp().getRequest().user,
);
