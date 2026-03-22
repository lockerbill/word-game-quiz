import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, UpgradeGuestDto } from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new account' })
  @ApiResponse({ status: 201, description: 'Returns JWT access_token and user object' })
  @ApiResponse({ status: 409, description: 'Email or username already exists' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Returns JWT access_token and user object' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('guest')
  @ApiOperation({ summary: 'Create a guest account and receive a JWT' })
  @ApiResponse({ status: 201, description: 'Returns JWT access_token and guest user object' })
  guest() {
    return this.authService.guest();
  }

  @Post('upgrade')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Upgrade a guest account to a full registered account' })
  @ApiResponse({ status: 200, description: 'Returns new JWT and updated user object' })
  @ApiResponse({ status: 400, description: 'Account is not a guest' })
  @ApiResponse({ status: 409, description: 'Email or username already exists' })
  upgrade(@Request() req, @Body() dto: UpgradeGuestDto) {
    return this.authService.upgrade(req.user.id, dto);
  }
}
