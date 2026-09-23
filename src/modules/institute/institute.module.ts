import { Module } from '@nestjs/common';
import { CoursesModule } from './courses/courses.module';
import { EventsModule } from './events/events.module';
import { InstituteInformationModule } from './information/institute-information.module';
import { TrainingsModule } from './trainings/trainings.module';
import { VenuesModule } from './venues/venues.module';

/**
 * Modulo orquestador del Instituto Biblico (`docs/instituto-biblico-isma.md` §2). Cada
 * sub-recurso es una vertical slice independiente; este modulo solo agrega sus imports
 * para que `AppModule` importe uno solo.
 */
@Module({
  imports: [
    InstituteInformationModule,
    TrainingsModule,
    CoursesModule,
    VenuesModule,
    EventsModule,
  ],
})
export class InstituteModule {}
