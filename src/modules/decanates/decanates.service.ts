import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CatalogService } from '../../common/catalog';
import { Decanato } from './entities/decanato.entity';

/** `decanatos_decanato` es un catalogo "solo nombre": todo el CRUD vive en `CatalogService`. */
@Injectable()
export class DecanatesService extends CatalogService<Decanato> {
  constructor(@InjectRepository(Decanato) repo: Repository<Decanato>) {
    super(repo, {
      alias: 'd',
      activateMessage: 'Decanato habilitado correctamente.',
    });
  }
}
