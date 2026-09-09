import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { buildPage, type Paginated } from '../../common/pagination';
import { ListUsersQueryDto } from './dto/list-users.query';
import { Usuario } from './entities/usuario.entity';
import { toUserResponse, type UserResponse } from './user.response';

const NOT_FOUND = { detail: 'No encontrado.' };

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Usuario) private readonly repo: Repository<Usuario>,
  ) {}

  /**
   * `GET /users/usuarios/` — siempre paginado, excluye al propio usuario, orden `username`.
   * Filtros de Django: `username` (icontains) e `isActive`.
   */
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

  /** Carga el usuario con sus relaciones de auditoria. Django no filtra por `isActive`. */
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
}
