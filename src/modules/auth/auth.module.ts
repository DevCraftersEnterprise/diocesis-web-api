import { Module } from '@nestjs/common';
import { PasswordService } from './password.service';

/**
 * Modulo de autenticacion (FASE 2). En 2.2 solo aporta `PasswordService`; en 2.3-2.6
 * se le anaden `@nestjs/jwt`, la `JwtStrategy`, el `AuthService` y los guards.
 */
@Module({
  providers: [PasswordService],
  exports: [PasswordService],
})
export class AuthModule {}
