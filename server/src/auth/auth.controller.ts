import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, UpgradeGuestDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('guest')
  guest() {
    return this.authService.guest();
  }

  @Post('upgrade')
  @UseGuards(AuthGuard('jwt'))
  upgrade(@Request() req, @Body() dto: UpgradeGuestDto) {
    return this.authService.upgrade(req.user.id, dto);
  }
}
