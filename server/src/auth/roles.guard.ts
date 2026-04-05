import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { User, UserRole } from '../entities/user.entity';
import { ROLES_KEY } from './roles.decorator';

interface RequestWithUser {
  user?: Pick<User, 'id' | 'role' | 'accountStatus'>;
  method?: string;
  url?: string;
  ip?: string;
}

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      this.logger.warn(
        `Denied admin access: missing user for ${request.method ?? 'UNKNOWN'} ${request.url ?? 'unknown-url'} ip=${request.ip ?? 'unknown-ip'}`,
      );
      throw new UnauthorizedException('Authentication required');
    }

    if (user.accountStatus !== 'active') {
      this.logger.warn(
        `Denied admin access: suspended user=${user.id} role=${user.role} ${request.method ?? 'UNKNOWN'} ${request.url ?? 'unknown-url'} ip=${request.ip ?? 'unknown-ip'}`,
      );
      throw new ForbiddenException('Account is suspended');
    }

    if (!requiredRoles.includes(user.role)) {
      this.logger.warn(
        `Denied admin access: user=${user.id} role=${user.role} required=[${requiredRoles.join(',')}] ${request.method ?? 'UNKNOWN'} ${request.url ?? 'unknown-url'} ip=${request.ip ?? 'unknown-ip'}`,
      );
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
