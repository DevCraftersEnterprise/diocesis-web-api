import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { buildPage, type Paginated } from '../../../common/pagination';
import type { Usuario } from '../../users/entities/usuario.entity';
import { Curso } from '../courses/entities/curso.entity';
import { Sede } from '../venues/entities/sede.entity';
import {
  CreateEventoDto,
  ListEventoQueryDto,
  UpdateEventoDto,
} from './dto/evento.dto';
import { Evento } from './entities/evento.entity';
import { toEventoResponse, type EventoResponse } from './evento.response';

const NOT_FOUND = { detail: 'No encontrado.' };

/**
 * CRUD de `institutos_evento` (Tarea 5.1) — calendario del Instituto Biblico. Combina el
 * patron canonico de Articulos con la validacion de FK opcional de `courses.service.ts`
 * (aqui, dos FKs opcionales: `cursoId`, `sedeId`).
 */
@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Evento)
    private readonly repo: Repository<Evento>,
    @InjectRepository(Curso)
    private readonly cursos: Repository<Curso>,
    @InjectRepository(Sede)
    private readonly sedes: Repository<Sede>,
  ) {}

  async list(query: ListEventoQueryDto): Promise<Paginated<EventoResponse>> {
    const qb = this.repo
      .createQueryBuilder('e')
      .orderBy('e.startDate', 'ASC')
      .skip(query.skip)
      .take(query.take);

    if (query.type) {
      qb.andWhere('e.type = :type', { type: query.type });
    }
    if (query.cursoId) {
      qb.andWhere('e.cursoId = :cursoId', { cursoId: query.cursoId });
    }
    if (query.sedeId) {
      qb.andWhere('e.sedeId = :sedeId', { sedeId: query.sedeId });
    }
    if (query.startDate__gte) {
      qb.andWhere('e.startDate >= :startGte', {
        startGte: query.startDate__gte,
      });
    }
    if (query.startDate__lte) {
      qb.andWhere('e.startDate <= :startLte', {
        startLte: query.startDate__lte,
      });
    }
    if (query.isActive !== undefined) {
      qb.andWhere('e.isActive = :isActive', { isActive: query.isActive });
    }

    const [rows, total] = await qb.getManyAndCount();
    return buildPage(rows.map(toEventoResponse), total, query);
  }

  async findOr404(id: string): Promise<Evento> {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) throw new NotFoundException(NOT_FOUND);
    return row;
  }

  private async findActiveOr404(id: string): Promise<Evento> {
    const row = await this.repo.findOne({ where: { id, isActive: true } });
    if (!row) throw new NotFoundException(NOT_FOUND);
    return row;
  }

  async detail(id: string): Promise<EventoResponse> {
    return toEventoResponse(await this.findOr404(id));
  }

  private async assertFksExist(
    cursoId?: string,
    sedeId?: string,
  ): Promise<void> {
    if (
      cursoId !== undefined &&
      !(await this.cursos.existsBy({ id: cursoId }))
    ) {
      throw new BadRequestException({
        cursoId: ['No existe un curso con ese id.'],
      });
    }
    if (sedeId !== undefined && !(await this.sedes.existsBy({ id: sedeId }))) {
      throw new BadRequestException({
        sedeId: ['No existe una sede con ese id.'],
      });
    }
  }

  async create(dto: CreateEventoDto, actor: Usuario): Promise<EventoResponse> {
    await this.assertFksExist(dto.cursoId, dto.sedeId);

    const id = randomUUID();
    const now = new Date();
    await this.repo.insert({
      id,
      title: dto.title,
      description: dto.description ?? null,
      type: dto.type,
      startDate: dto.startDate,
      endDate: dto.endDate ?? null,
      cursoId: dto.cursoId ?? null,
      sedeId: dto.sedeId ?? null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdById: actor.id,
    });
    return this.detail(id);
  }

  async update(
    id: string,
    dto: UpdateEventoDto,
    actor: Usuario,
  ): Promise<EventoResponse> {
    await this.findActiveOr404(id);
    await this.assertFksExist(dto.cursoId, dto.sedeId);

    const changes: Partial<Evento> = {
      updatedById: actor.id,
      updatedAt: new Date(),
    };
    if (dto.title !== undefined) changes.title = dto.title;
    if (dto.description !== undefined) changes.description = dto.description;
    if (dto.type !== undefined) changes.type = dto.type;
    if (dto.startDate !== undefined) changes.startDate = dto.startDate;
    if (dto.endDate !== undefined) changes.endDate = dto.endDate;
    if (dto.cursoId !== undefined) changes.cursoId = dto.cursoId;
    if (dto.sedeId !== undefined) changes.sedeId = dto.sedeId;

    await this.repo.update(id, changes);
    return this.detail(id);
  }

  async softDelete(id: string, actor: Usuario): Promise<void> {
    await this.findActiveOr404(id);
    await this.repo.update(id, {
      isActive: false,
      deletedAt: new Date(),
      deletedById: actor.id,
      updatedAt: new Date(),
    });
  }

  async activate(id: string, actor: Usuario): Promise<{ detail: string }> {
    const row = await this.repo.findOne({ where: { id, isActive: false } });
    if (!row) throw new NotFoundException(NOT_FOUND);
    await this.repo.update(id, {
      isActive: true,
      deletedAt: null,
      deletedById: null,
      updatedById: actor.id,
      updatedAt: new Date(),
    });
    return { detail: 'Evento habilitado correctamente.' };
  }
}
