import { Module } from '@nestjs/common';
import { IsmaInformationModule } from './information/isma-information.module';

/**
 * Modulo orquestador de ISMA (`docs/instituto-biblico-isma.md` §2), espejo de
 * `InstituteModule`. Cada sub-recurso es una vertical slice independiente; este modulo
 * solo agrega sus imports para que `AppModule` importe uno solo. Se amplia en FASE 7 con
 * `special-cases`, `faq`.
 */
@Module({
  imports: [IsmaInformationModule],
})
export class IsmaModule {}
