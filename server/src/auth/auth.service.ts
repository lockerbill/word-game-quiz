import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../entities/user.entity';
import { RegisterDto, LoginDto, UpgradeGuestDto } from './dto/auth.dto';
import { JwtPayload } from './jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private jwtService: JwtService,
  ) {}

  private generateToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      isGuest: user.isGuest,
    };
    return this.jwtService.sign(payload);
  }

  async register(dto: RegisterDto) {
    // Check existing
    const existing = await this.userRepo.findOne({
      where: [{ email: dto.email }, { username: dto.username }],
    });
    if (existing) {
      throw new ConflictException('Email or username already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      username: dto.username,
      email: dto.email,
      passwordHash,
      isGuest: false,
    });
    await this.userRepo.save(user);

    return {
      access_token: this.generateToken(user),
      user: this.sanitizeUser(user),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      access_token: this.generateToken(user),
      user: this.sanitizeUser(user),
    };
  }

  async guest() {
    const guestId = uuidv4().slice(0, 8);
    const user = this.userRepo.create({
      username: `Guest_${guestId}`,
      isGuest: true,
    });
    await this.userRepo.save(user);

    return {
      access_token: this.generateToken(user),
      user: this.sanitizeUser(user),
    };
  }

  async upgrade(userId: string, dto: UpgradeGuestDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || !user.isGuest) {
      throw new BadRequestException('Only guest accounts can be upgraded');
    }

    // Check conflicts
    const existing = await this.userRepo.findOne({
      where: [{ email: dto.email }, { username: dto.username }],
    });
    if (existing && existing.id !== userId) {
      throw new ConflictException('Email or username already exists');
    }

    user.username = dto.username;
    user.email = dto.email;
    user.passwordHash = await bcrypt.hash(dto.password, 10);
    user.isGuest = false;
    await this.userRepo.save(user);

    return {
      access_token: this.generateToken(user),
      user: this.sanitizeUser(user),
    };
  }

  private sanitizeUser(user: User) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      isGuest: user.isGuest,
      avatar: user.avatar,
      level: user.level,
      xp: user.xp,
      gamesPlayed: user.gamesPlayed,
      bestScore: user.bestScore,
    };
  }
}
