import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
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

  /** SECURITY-006: limitado a `THROTTLE_AUTH_LIMIT` intentos por ventana e IP. */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  login(@Body() dto: LoginDto): Promise<TokenPair> {
    return this.auth.login(dto.username, dto.password);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto): Promise<{ access: string }> {
    return this.auth.refresh(dto.refresh);
  }
}
