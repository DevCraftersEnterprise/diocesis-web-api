import { Module } from '@nestjs/common';
import { FaqModule } from './faq/faq.module';
import { IsmaInformationModule } from './information/isma-information.module';
import { SpecialCasesModule } from './special-cases/special-cases.module';

/**
 * Modulo orquestador de ISMA (`docs/instituto-biblico-isma.md` §2), espejo de
 * `InstituteModule`. Cada sub-recurso es una vertical slice independiente; este modulo
 * solo agrega sus imports para que `AppModule` importe uno solo.
 */
@Module({
  imports: [IsmaInformationModule, SpecialCasesModule, FaqModule],
})
export class IsmaModule {}
