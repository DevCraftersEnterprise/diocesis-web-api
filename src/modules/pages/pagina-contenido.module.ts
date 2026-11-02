import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CloudinaryModule } from '../../integrations/cloudinary/cloudinary.module';
import { PaginaContenido } from './entities/pagina-contenido.entity';
import { PaginaImagen } from './entities/pagina-imagen.entity';
import { PaginaContenidoController } from './pagina-contenido.controller';
import { PaginaContenidoService } from './pagina-contenido.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaginaContenido, PaginaImagen]),
    CloudinaryModule,
  ],
  controllers: [PaginaContenidoController],
  providers: [PaginaContenidoService],
})
export class PaginaContenidoModule {}
