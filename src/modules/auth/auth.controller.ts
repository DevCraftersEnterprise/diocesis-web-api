import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import type { TokenPair } from './token.types';

/**
 * `/api/token/` (ADR-002 pto. 2). Endpoints publicos: replican
 * `CustomTokenObtainPairView` y `TokenRefreshView` de simplejwt.
 */
@Public()
@Controller('token')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<TokenPair> {
    return this.auth.login(dto.username, dto.password);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto): Promise<{ access: string }> {
    return this.auth.refresh(dto.refresh);
  }
}
