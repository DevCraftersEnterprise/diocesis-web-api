import { ForbiddenException } from '@nestjs/common';
import type { Usuario } from './entities/usuario.entity';

const FORBIDDEN_SUPER = {
  detail: "No puedes realizar esta accion sobre un usuario con rol 'super'.",
};

/**
 * Regla dispersa e incompleta en Django (BUG-DJANGO-021), aqui centralizada: un `admin`
 * no puede editar / borrar / (des)activar / resetear a un `super`. Un `super` puede con
 * cualquiera.
 */
export function assertCanManage(actor: Usuario, target: Usuario): void {
  if (actor.role === 'admin' && target.role === 'super') {
    throw new ForbiddenException(FORBIDDEN_SUPER);
  }
}

/** Un `admin` tampoco puede asignar el rol `super` (ni al crear ni al editar). */
export function assertCanAssignRole(actor: Usuario, role: string): void {
  if (actor.role === 'admin' && role === 'super') {
    throw new ForbiddenException({
      detail: "Un admin no puede asignar el rol 'super'.",
    });
  }
}
