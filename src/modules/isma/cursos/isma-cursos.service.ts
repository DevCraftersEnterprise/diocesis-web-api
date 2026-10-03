import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { buildPage, type Paginated } from '../../../common/pagination';
import { Parroquia } from '../../parishes/entities/parroquia.entity';
import type { Usuario } from '../../users/entities/usuario.entity';
import {
  CreateIsmaCursoDto,
  ListIsmaCursoGestionQueryDto,
  ListIsmaCursoPublicQueryDto,
  UpdateIsmaCursoDto,
} from './dto/isma-curso.dto';
import { IsmaCurso } from './entities/isma-curso.entity';
import {
  toIsmaCursoResponse,
  type IsmaCursoResponse,
} from './isma-curso.response';

const NOT_FOUND = { detail: 'No encontrado.' };
/** Zona horaria de la diocesis (Sonora no cambia de horario en verano). */
const ZONA_DIOCESIS = 'America/Hermosillo';

/** Fecha de hoy `YYYY-MM-DD` en la zona de la diocesis. */
export function hoyEnDiocesis(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_DIOCESIS,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

interface CursoCampos {
  startDate: string;
  endDate: string;
  diaSemana: number | null;
  horaInicio: string | null;
  horaFin: string | null;
}

/** Coherencia entre fechas, dia y horario, sobre el estado final de la fila. */
function assertCoherente(c: CursoCampos): void {
  if (c.endDate < c.startDate) {
    throw new BadRequestException({
      endDate: ['La fecha de fin no puede ser anterior a la de inicio.'],
    });
  }
  if ((c.horaInicio || c.horaFin) && c.diaSemana === null) {
    throw new BadRequestException({
      diaSemana: ['Indica el dia de la semana cuando capturas horario.'],
    });
  }
  if (c.diaSemana !== null && (!c.horaInicio || !c.horaFin)) {
    throw new BadRequestException({
      horaInicio: ['Con dia de la semana se requieren horaInicio y horaFin.'],
    });
  }
  if (c.horaInicio && c.horaFin && c.horaFin <= c.horaInicio) {
    throw new BadRequestException({
      horaFin: ['horaFin debe ser posterior a horaInicio.'],
    });
  }
}

/**
 * CRUD de `isma_curso` (calendarizacion de cursos ISMA). Las parroquias se reutilizan
 * (`parroquias_parroquia`). Publico: solo activos que aun no terminan; el detalle sirve
 * tambien para cursos terminados (enlaces compartidos) con `finalizado: true`.
 */
@Injectable()
export class IsmaCursosService {
  constructor(
    @InjectRepository(IsmaCurso)
    private readonly repo: Repository<IsmaCurso>,
    @InjectRepository(Parroquia)
    private readonly parroquias: Repository<Parroquia>,
  ) {}

  private baseQuery() {
    return this.repo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.parroquia', 'p');
  }

  async listPublic(
    query: ListIsmaCursoPublicQueryDto,
  ): Promise<Paginated<IsmaCursoResponse>> {
    const hoy = hoyEnDiocesis();
    const qb = this.baseQuery()
      .where('c.isActive = :active', { active: true })
      .andWhere('c.endDate >= :hoy', { hoy })
      .orderBy('c.startDate', 'ASC')
      .skip(query.skip)
      .take(query.take);
    this.aplicarFiltros(qb, query);
    const [rows, total] = await qb.getManyAndCount();
    return buildPage(
      rows.map((r) => toIsmaCursoResponse(r, hoy)),
      total,
      query,
    );
  }

  async listGestion(
    query: ListIsmaCursoGestionQueryDto,
  ): Promise<Paginated<IsmaCursoResponse>> {
    const hoy = hoyEnDiocesis();
    const qb = this.baseQuery()
      .orderBy('c.startDate', 'ASC')
      .skip(query.skip)
      .take(query.take);
    this.aplicarFiltros(qb, query);
    if (query.isActive !== undefined) {
      qb.andWhere('c.isActive = :isActive', { isActive: query.isActive });
    }
    const [rows, total] = await qb.getManyAndCount();
    return buildPage(
      rows.map((r) => toIsmaCursoResponse(r, hoy)),
      total,
      query,
    );
  }

  private aplicarFiltros(
    qb: ReturnType<IsmaCursosService['baseQuery']>,
    query: ListIsmaCursoPublicQueryDto,
  ): void {
    if (query.parroquiaId) {
      qb.andWhere('c.parroquiaId_id = :parroquiaId', {
        parroquiaId: query.parroquiaId,
      });
    }
    if (query.modalidad) {
      qb.andWhere('c.modalidad = :modalidad', { modalidad: query.modalidad });
    }
  }

  private async findOr404(id: string): Promise<IsmaCurso> {
    const row = await this.baseQuery().where('c.id = :id', { id }).getOne();
    if (!row) throw new NotFoundException(NOT_FOUND);
    return row;
  }

  private async findActiveOr404(id: string): Promise<IsmaCurso> {
    const row = await this.baseQuery()
      .where('c.id = :id', { id })
      .andWhere('c.isActive = :active', { active: true })
      .getOne();
    if (!row) throw new NotFoundException(NOT_FOUND);
    return row;
  }

  /** Detalle publico: activo, este o no terminado. Los deshabilitados no se exponen. */
  async detailPublic(id: string): Promise<IsmaCursoResponse> {
    return toIsmaCursoResponse(await this.findActiveOr404(id), hoyEnDiocesis());
  }

  async detailGestion(id: string): Promise<IsmaCursoResponse> {
    return toIsmaCursoResponse(await this.findOr404(id), hoyEnDiocesis());
  }

  private async assertParroquiaExiste(parroquiaId: string): Promise<void> {
    if (
      !(await this.parroquias.existsBy({ id: parroquiaId, isActive: true }))
    ) {
      throw new BadRequestException({
        parroquiaId: ['No existe una parroquia activa con ese id.'],
      });
    }
  }

  async create(
    dto: CreateIsmaCursoDto,
    actor: Usuario,
  ): Promise<IsmaCursoResponse> {
    const campos: CursoCampos = {
      startDate: dto.startDate,
      endDate: dto.endDate,
      diaSemana: dto.diaSemana ?? null,
      horaInicio: dto.horaInicio ?? null,
      horaFin: dto.horaFin ?? null,
    };
    assertCoherente(campos);
    await this.assertParroquiaExiste(dto.parroquiaId);

    const id = randomUUID();
    const now = new Date();
    await this.repo.insert({
      id,
      parroquiaId: dto.parroquiaId,
      ...campos,
      modalidad: dto.modalidad,
      telefonoInformes: dto.telefonoInformes ?? null,
      notas: dto.notas ?? null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdById: actor.id,
    });
    return this.detailGestion(id);
  }

  async update(
    id: string,
    dto: UpdateIsmaCursoDto,
    actor: Usuario,
  ): Promise<IsmaCursoResponse> {
    const actual = await this.findActiveOr404(id);

    const campos: CursoCampos = {
      startDate: dto.startDate ?? actual.startDate,
      endDate: dto.endDate ?? actual.endDate,
      diaSemana: dto.diaSemana !== undefined ? dto.diaSemana : actual.diaSemana,
      horaInicio:
        dto.horaInicio !== undefined ? dto.horaInicio : actual.horaInicio,
      horaFin: dto.horaFin !== undefined ? dto.horaFin : actual.horaFin,
    };
    assertCoherente(campos);
    if (dto.parroquiaId !== undefined) {
      await this.assertParroquiaExiste(dto.parroquiaId);
    }

    const changes: Partial<IsmaCurso> = {
      ...campos,
      updatedById: actor.id,
      updatedAt: new Date(),
    };
    if (dto.parroquiaId !== undefined) changes.parroquiaId = dto.parroquiaId;
    if (dto.modalidad !== undefined) changes.modalidad = dto.modalidad;
    if (dto.telefonoInformes !== undefined) {
      changes.telefonoInformes = dto.telefonoInformes;
    }
    if (dto.notas !== undefined) changes.notas = dto.notas;

    await this.repo.update(id, changes);
    return this.detailGestion(id);
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
    return { detail: 'Curso habilitado correctamente.' };
  }
}
