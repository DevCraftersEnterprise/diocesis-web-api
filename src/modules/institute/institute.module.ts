import { Module } from '@nestjs/common';
import { InstituteInformationModule } from './information/institute-information.module';

/**
 * Modulo orquestador del Instituto Biblico (`docs/instituto-biblico-isma.md` §2). Cada
 * sub-recurso es una vertical slice independiente; este modulo solo agrega sus imports
 * para que `AppModule` importe uno solo. Se amplia en FASE 4/5 con `trainings`,
 * `courses`, `venues`, `events`.
 */
@Module({
  imports: [InstituteInformationModule],
})
export class InstituteModule {}
