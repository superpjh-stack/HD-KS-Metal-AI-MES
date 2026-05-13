import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RequestUser } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';

const REFRESH_COOKIE = 'ks_refresh';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, refreshToken } = await this.authService.login(dto.email, dto.password);
    this.setRefreshCookie(res, refreshToken);
    return { data: token };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.signedCookies?.[REFRESH_COOKIE] as string | undefined;
    if (!refreshToken) throw new UnauthorizedException('리프레시 토큰이 없습니다.');

    const { token, refreshToken: newRefresh } = await this.authService.refresh(refreshToken);
    this.setRefreshCookie(res, newRefresh);
    return { data: token };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.signedCookies?.[REFRESH_COOKIE] as string | undefined;
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
    res.clearCookie(REFRESH_COOKIE);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(
    @Req() req: Request,
    @CurrentUser() user: RequestUser,
  ) {
    const token = req.headers.authorization?.replace('Bearer ', '') ?? '';
    const data = await this.authService.getMe(token, user);
    return { data };
  }

  private setRefreshCookie(res: Response, token: string) {
    const maxAge = Number(this.config.get('JWT_REFRESH_EXPIRY', 28800)) * 1000;
    const secure = this.config.get('COOKIE_SECURE') === 'true';

    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      signed: true,
      secure,
      sameSite: 'strict',
      maxAge,
      domain: this.config.get('COOKIE_DOMAIN', 'localhost'),
    });
  }
}
