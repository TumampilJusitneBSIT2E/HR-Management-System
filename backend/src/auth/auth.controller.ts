import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import type { AuthenticatedRequest } from './auth.types';
import { AllowPasswordChange, Public } from './decorators/public.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';

const SESSION_COOKIE = 'hr_session';

function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: 15 * 60 * 1000,
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(dto.email, dto.password, request.ip);
    response.cookie(SESSION_COOKIE, result.accessToken, sessionCookieOptions());
    response.setHeader('Cache-Control', 'no-store');
    return { accessToken: result.accessToken, user: result.user };
  }

  @Get('me')
  @AllowPasswordChange()
  getProfile(@Req() request: AuthenticatedRequest) {
    return this.authService.getProfile(request.user.EmployeeID);
  }

  @Post('change-password')
  @AllowPasswordChange()
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.changePassword(
      request.user.EmployeeID,
      dto.currentPassword,
      dto.newPassword,
    );
    response.cookie(SESSION_COOKIE, result.accessToken, sessionCookieOptions());
    response.setHeader('Cache-Control', 'no-store');
    return { accessToken: result.accessToken, user: result.user };
  }

  @Public()
  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(SESSION_COOKIE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
    return { success: true };
  }
}
