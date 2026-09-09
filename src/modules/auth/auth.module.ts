import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { Config } from '../../config/config.types';
import { Usuario } from '../users/entities/usuario.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { JwtStrategy } from './jwt.strategy';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

/**
 * Modulo de autenticacion (FASE 2). 2.2: `PasswordService`. 2.3: `@nestjs/jwt` (HS256),
 * `TokenService`, `JwtStrategy`. Guards y endpoints de login en 2.5-2.6.
 */
@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([Usuario]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const jwt = config.getOrThrow<Config['jwt']>('app-config.jwt');
        return {
          secret: jwt.secret,
          signOptions: { algorithm: 'HS256' },
          verifyOptions: { algorithms: ['HS256'] },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    TokenService,
    JwtStrategy,
    // Orden importa: JwtAuthGuard (autentica y pone request.user) antes que RolesGuard.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [PasswordService, TokenService],
})
export class AuthModule {}
