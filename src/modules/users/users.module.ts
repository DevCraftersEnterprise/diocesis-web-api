import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from './entities/usuario.entity';

/**
 * Modulo de usuarios (FASE 2). Por ahora solo registra la entidad; controlador y servicio
 * llegan en 2.7-2.11.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Usuario])],
  exports: [TypeOrmModule],
})
export class UsersModule {}
