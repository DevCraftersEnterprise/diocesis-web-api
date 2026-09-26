import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { parse } from 'csv-parse/sync';
import { Repository } from 'typeorm';
import { buildPage, type Paginated } from '../../common/pagination';
import { PasswordService } from '../auth/password.service';
import { assertCanAssignRole, assertCanManage } from './can-manage';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users.query';
import { UpdateUserDto } from './dto/update-user.dto';
import { Usuario, type UserRole } from './entities/usuario.entity';
import { assertPasswordPolicy, generatePassword } from './password-policy';
import { toUserResponse, type UserResponse } from './user.response';

const NOT_FOUND = { detail: 'No encontrado.' };
const DUPLICATE_USERNAME = {
  error: 'El nombre de usuario ya esta registrado.',
};
const CSV_ROLES: readonly string[] = ['user', 'admin', 'super'];

export interface CsvImportResult {
  mensaje: string;
  creados: string[];
  errores: string[];
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Usuario) private readonly repo: Repository<Usuario>,
    private readonly passwords: PasswordService,
  ) {}

  async list(
    query: ListUsersQueryDto,
    excludeUserId: string,
  ): Promise<Paginated<UserResponse>> {
    const qb = this.repo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.updatedBy', 'ub')
      .leftJoinAndSelect('u.deletedBy', 'db')
      .where('u.id != :excludeUserId', { excludeUserId })
      .orderBy('u.username', 'ASC')
      .skip(query.skip)
      .take(query.take);

    if (query.username) {
      qb.andWhere('u.username ILIKE :pattern', {
        pattern: `%${query.username}%`,
      });
    }
    if (query.isActive !== undefined) {
      qb.andWhere('u.isActive = :isActive', { isActive: query.isActive });
    }

    const [rows, total] = await qb.getManyAndCount();
    return buildPage(rows.map(toUserResponse), total, query);
  }

  /** Django no filtra por `isActive` en el detalle de usuarios. */
  async findOr404(id: string): Promise<Usuario> {
    const user = await this.repo.findOne({
      where: { id },
      relations: { updatedBy: true, deletedBy: true },
    });
    if (!user) throw new NotFoundException(NOT_FOUND);
    return user;
  }

  async findForResponse(id: string): Promise<UserResponse> {
    return toUserResponse(await this.findOr404(id));
  }

  /** `POST /users/usuarios/` (BUG-DJANGO-009: `role` requerido; -014: un solo hash). */
  async create(dto: CreateUserDto, actor: Usuario): Promise<UserResponse> {
    assertCanAssignRole(actor, dto.role);

    if (await this.repo.existsBy({ username: dto.username })) {
      throw new BadRequestException(DUPLICATE_USERNAME);
    }
    assertPasswordPolicy(dto.password, {
      username: dto.username,
      email: dto.email,
    });

    const id = randomUUID();
    await this.repo.insert({
      id,
      username: dto.username,
      email: dto.email,
      role: dto.role,
      moduleAccess: dto.moduleAccess ?? [],
      password: await this.passwords.hash(dto.password),
      isActive: true,
      isActiveAuth: true,
      isStaff: false,
      isSuperuser: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      updatedById: actor.id,
    });
    return this.findForResponse(id);
  }

  /**
   * `PUT /users/usuarios/{id}/` — parcial, sin password (BUG-DJANGO-010).
   * Se usa `repo.update` (no `save`) para tocar solo las columnas escalares y no
   * interferir con la relacion `updatedBy` cargada.
   */
  async update(
    id: string,
    dto: UpdateUserDto,
    actor: Usuario,
  ): Promise<UserResponse> {
    const target = await this.findOr404(id);
    assertCanManage(actor, target);
    if (dto.role) assertCanAssignRole(actor, dto.role);

    await this.repo.update(id, {
      ...dto,
      updatedById: actor.id,
      updatedAt: new Date(),
    });
    return this.findForResponse(id);
  }

  /** `DELETE /users/usuarios/{id}/` — soft-delete; ambos flags a `false` (BUG-DJANGO-020). */
  async softDelete(id: string, actor: Usuario): Promise<void> {
    const target = await this.findOr404(id);
    assertCanManage(actor, target);

    await this.repo.update(id, {
      isActive: false,
      isActiveAuth: false,
      deletedAt: new Date(),
      deletedById: actor.id,
      updatedAt: new Date(),
    });
  }

  /** `PUT /users/usuarios/cambiar-estado/{id}/` — toggle sincronizando ambos flags. */
  async toggleStatus(id: string, actor: Usuario): Promise<{ mensaje: string }> {
    const target = await this.findOr404(id);
    assertCanManage(actor, target);

    const next = !target.isActive;
    await this.repo.update(id, {
      isActive: next,
      isActiveAuth: next,
      updatedById: actor.id,
      updatedAt: new Date(),
      deletedAt: next ? null : new Date(),
      deletedById: next ? null : actor.id,
    });

    const estado = next ? 'activado' : 'desactivado';
    return {
      mensaje: `Usuario ${target.username} ha sido ${estado} correctamente.`,
    };
  }

  /**
   * `PUT /users/usuarios/change-password/` sobre el usuario autenticado.
   * **Endurecido** (BUG-DJANGO-005): exige la contrasena actual y aplica la politica.
   */
  async changePassword(
    actor: Usuario,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ mensaje: string }> {
    const { valid } = await this.passwords.verify(
      currentPassword,
      actor.password,
    );
    if (!valid) {
      throw new BadRequestException({
        current_password: ['La contrasena actual no es correcta.'],
      });
    }
    assertPasswordPolicy(
      newPassword,
      { username: actor.username, email: actor.email },
      'new_password',
    );

    await this.repo.update(actor.id, {
      password: await this.passwords.hash(newPassword),
      updatedAt: new Date(),
    });
    return { mensaje: 'Contrasena actualizada correctamente.' };
  }

  /**
   * `POST /users/usuarios/reset-password/{id}/` (admin/super).
   * BUG-DJANGO-002: genera una contrasena ALEATORIA (antes = username) y la devuelve en
   * la respuesta para que el admin la comunique (no hay flujo de email).
   */
  async resetPassword(
    id: string,
    actor: Usuario,
  ): Promise<{ mensaje: string; password: string }> {
    const target = await this.findOr404(id);
    assertCanManage(actor, target);

    const password = generatePassword();
    await this.repo.update(id, {
      password: await this.passwords.hash(password),
      updatedById: actor.id,
      updatedAt: new Date(),
    });
    return {
      mensaje: `Contrasena de ${target.username} reseteada correctamente.`,
      password,
    };
  }

  /**
   * `POST /users/usuarios/cargar-por-csv/` (admin/super). Cabeceras
   * `username,email,role[,password]`; `password` ausente -> se usa el `username` (como
   * Django). Recorre fila a fila acumulando `creados` / `errores`, sin abortar.
   * A diferencia de Django, esta via **si** aplica la politica de contrasenas
   * (`assertPasswordPolicy`) por fila (BUG-DJANGO-005, Tarea 8.4): `password` = `username`
   * la rechaza por "parecida al usuario".
   */
  async createFromCsv(csv: Buffer, actor: Usuario): Promise<CsvImportResult> {
    let rows: Record<string, string>[];
    try {
      rows = parse(csv, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch {
      throw new BadRequestException({
        error: 'El archivo CSV no se pudo leer.',
      });
    }

    const creados: string[] = [];
    const errores: string[] = [];

    for (const row of rows) {
      const username = row.username?.trim();
      const email = row.email?.trim();
      const role = row.role?.trim();
      const password = row.password?.trim() || username;

      if (!username || !email || !role) {
        errores.push(
          `Faltan campos obligatorios en la fila: ${JSON.stringify(row)}`,
        );
        continue;
      }
      if (!CSV_ROLES.includes(role)) {
        errores.push(`Rol invalido para ${username}`);
        continue;
      }
      if (actor.role === 'admin' && role === 'super') {
        errores.push(`No puedes crear superusuarios como admin: ${username}`);
        continue;
      }
      if (await this.repo.existsBy({ username })) {
        errores.push(`Usuario ya existe: ${username}`);
        continue;
      }
      try {
        assertPasswordPolicy(password, { username, email });
      } catch (e) {
        const body = (e as BadRequestException).getResponse() as {
          password?: string[];
        };
        errores.push(
          `Contrasena invalida para ${username}: ${(body.password ?? ['no cumple la politica']).join(' ')}`,
        );
        continue;
      }

      try {
        await this.repo.insert({
          id: randomUUID(),
          username,
          email,
          role: role as UserRole,
          password: await this.passwords.hash(password),
          isActive: true,
          isActiveAuth: true,
          isStaff: false,
          isSuperuser: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          updatedById: actor.id,
        });
        creados.push(username);
      } catch (e) {
        errores.push(
          `Error al crear ${username}: ${e instanceof Error ? e.message : 'error'}`,
        );
      }
    }

    return {
      mensaje: `Se procesaron ${creados.length} usuarios.`,
      creados,
      errores,
    };
  }
}
