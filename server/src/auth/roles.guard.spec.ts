import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const handler = jest.fn();
  const targetClass = class TestClass {};

  const buildContext = (user?: {
    id: string;
    role: 'player' | 'moderator' | 'admin' | 'super_admin';
    accountStatus: 'active' | 'suspended';
  }): ExecutionContext =>
    ({
      getHandler: () => handler,
      getClass: () => targetClass,
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  it('allows request when no role metadata is present', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(buildContext())).toBe(true);
  });

  it('allows admin role when required role is admin', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['admin']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    const result = guard.canActivate(
      buildContext({ id: 'u1', role: 'admin', accountStatus: 'active' }),
    );

    expect(result).toBe(true);
  });

  it('denies player role when admin is required', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['admin']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() =>
      guard.canActivate(
        buildContext({ id: 'u1', role: 'player', accountStatus: 'active' }),
      ),
    ).toThrow('Insufficient permissions');
  });
});
