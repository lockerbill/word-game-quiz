import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

export interface JwtPayload {
  sub: string;
  username: string;
  isGuest: boolean;
  role: User['role'];
  accountStatus: User['accountStatus'];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        process.env.JWT_SECRET || 'alpha-bucks-secret-key-change-in-production',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user) {
      this.logger.warn(
        `Denied JWT auth: user not found for payload sub=${payload.sub}`,
      );
      throw new UnauthorizedException();
    }

    if (user.accountStatus !== 'active') {
      this.logger.warn(
        `Denied JWT auth: suspended user id=${user.id} role=${user.role}`,
      );
      throw new UnauthorizedException();
    }
    return user;
  }
}
