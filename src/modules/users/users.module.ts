import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from './entities/usuario.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

/** Modulo de usuarios (FASE 2). Lectura en 2.7; escritura/CSV/contrasenas en 2.8-2.11. */
@Module({
  imports: [TypeOrmModule.forFeature([Usuario])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [TypeOrmModule, UsersService],
})
export class UsersModule {}
