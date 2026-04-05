import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity.js';

@Injectable()
export class AdminBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async onApplicationBootstrap() {
    const enabled = process.env.ADMIN_BOOTSTRAP_ENABLED === 'true';
    if (!enabled) {
      return;
    }

    const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_BOOTSTRAP_PASSWORD?.trim();
    const preferredUsername =
      process.env.ADMIN_BOOTSTRAP_USERNAME?.trim() || 'superadmin';

    if (!email || !password) {
      this.logger.warn(
        'ADMIN_BOOTSTRAP_ENABLED=true but ADMIN_BOOTSTRAP_EMAIL/PASSWORD is missing. Skipping super admin bootstrap.',
      );
      return;
    }

    const existingByEmail = await this.userRepo.findOne({ where: { email } });
    const username = await this.resolveUsername(
      preferredUsername,
      existingByEmail?.id,
    );
    const passwordHash = await bcrypt.hash(password, 10);

    if (existingByEmail) {
      existingByEmail.username = username;
      existingByEmail.passwordHash = passwordHash;
      existingByEmail.isGuest = false;
      existingByEmail.role = 'super_admin';
      existingByEmail.accountStatus = 'active';
      await this.userRepo.save(existingByEmail);
      this.logger.log(`Super admin granted for existing user ${email}.`);
      return;
    }

    const user = this.userRepo.create({
      username,
      email,
      passwordHash,
      isGuest: false,
      role: 'super_admin',
      accountStatus: 'active',
    });

    await this.userRepo.save(user);
    this.logger.log(`Super admin bootstrap account created for ${email}.`);
  }

  private async resolveUsername(
    preferredUsername: string,
    excludeUserId?: string,
  ): Promise<string> {
    const normalized = preferredUsername.trim() || 'superadmin';

    for (let suffix = 0; suffix < 1000; suffix += 1) {
      const candidate =
        suffix === 0 ? normalized : `${normalized}${suffix + 1}`;
      const existing = await this.userRepo.findOne({
        where: { username: candidate },
      });

      if (!existing || existing.id === excludeUserId) {
        return candidate;
      }
    }

    throw new Error('Failed to resolve unique ADMIN_BOOTSTRAP_USERNAME');
  }
}
