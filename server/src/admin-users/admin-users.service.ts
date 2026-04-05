import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminAuditLogService } from '../admin/admin-audit-log.service.js';
import { User } from '../entities/user.entity.js';
import { ListAdminUsersQueryDto } from './dto/list-admin-users-query.dto.js';
import { UpdateUserRoleDto } from './dto/update-user-role.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';

interface AdminActor {
  id: string;
  role: User['role'];
}

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private adminAuditLogService: AdminAuditLogService,
  ) {}

  async listUsers(query: ListAdminUsersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.userRepo
      .createQueryBuilder('user')
      .orderBy('user.createdAt', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit);

    const search = query.search?.trim();
    if (search) {
      qb.andWhere(
        [
          '(LOWER(user.username) LIKE LOWER(:search)',
          "LOWER(COALESCE(user.email, '')) LIKE LOWER(:search))",
        ].join(' OR '),
        { search: `%${search}%` },
      );
    }

    if (query.role) {
      qb.andWhere('user.role = :role', { role: query.role });
    }

    if (query.accountStatus) {
      qb.andWhere('user.accountStatus = :accountStatus', {
        accountStatus: query.accountStatus,
      });
    }

    const [users, total] = await qb.getManyAndCount();

    return {
      page,
      limit,
      total,
      data: users.map((user) => this.toAdminUserResponse(user)),
    };
  }

  async updateUserRole(
    actor: AdminActor,
    targetUserId: string,
    dto: UpdateUserRoleDto,
  ) {
    const user = await this.getUserOrThrow(targetUserId);

    if (actor.role !== 'super_admin' && dto.role === 'super_admin') {
      throw new ForbiddenException(
        'Only super admins can grant super admin role',
      );
    }

    if (actor.role !== 'super_admin' && user.role === 'super_admin') {
      throw new ForbiddenException(
        'Only super admins can modify super admin users',
      );
    }

    const beforeState = {
      role: user.role,
      accountStatus: user.accountStatus,
    };

    user.role = dto.role;
    await this.userRepo.save(user);

    const afterState = {
      role: user.role,
      accountStatus: user.accountStatus,
    };

    await this.adminAuditLogService.logMutation({
      actorUserId: actor.id,
      action: 'user.role.update',
      targetType: 'user',
      targetId: user.id,
      reason: dto.reason,
      beforeState,
      afterState,
    });

    return this.toAdminUserResponse(user);
  }

  async updateUserStatus(
    actor: AdminActor,
    targetUserId: string,
    dto: UpdateUserStatusDto,
  ) {
    const user = await this.getUserOrThrow(targetUserId);

    if (actor.id === targetUserId && dto.accountStatus === 'suspended') {
      throw new ForbiddenException('Admins cannot suspend themselves');
    }

    if (actor.role !== 'super_admin' && user.role === 'super_admin') {
      throw new ForbiddenException(
        'Only super admins can modify super admin users',
      );
    }

    const beforeState = {
      role: user.role,
      accountStatus: user.accountStatus,
    };

    user.accountStatus = dto.accountStatus;
    await this.userRepo.save(user);

    const afterState = {
      role: user.role,
      accountStatus: user.accountStatus,
    };

    await this.adminAuditLogService.logMutation({
      actorUserId: actor.id,
      action: 'user.status.update',
      targetType: 'user',
      targetId: user.id,
      reason: dto.reason,
      beforeState,
      afterState,
    });

    return this.toAdminUserResponse(user);
  }

  private async getUserOrThrow(userId: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private toAdminUserResponse(user: User) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      isGuest: user.isGuest,
      avatar: user.avatar,
      role: user.role,
      accountStatus: user.accountStatus,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
