import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CatalogService } from '../../common/catalog';
import { Colonia } from './entities/colonia.entity';

@Injectable()
export class ColoniesService extends CatalogService<Colonia> {
  constructor(@InjectRepository(Colonia) repo: Repository<Colonia>) {
    // Texto EXACTO de Django (`HabilitarColoniaView`), concordancia incluida.
    super(repo, {
      alias: 'c',
      activateMessage: 'Colonia habilitado correctamente.',
    });
  }
}
