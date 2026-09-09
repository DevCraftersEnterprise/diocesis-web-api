import {
  Injectable,
  Logger,
  type OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type UploadApiResponse, v2 as cloudinary } from 'cloudinary';
import type { Config } from '../../config/config.types';

export interface CloudinaryUploadResult {
  secureUrl: string;
  publicId: string;
}

export interface CloudinaryUploadOptions {
  /** Carpeta base (p. ej. `padres`). Se le antepone el prefijo por entorno. */
  folder: string;
  resourceType?: 'image' | 'video' | 'raw';
}

/**
 * Subidas a Cloudinary (ADR / findings PERF-004, BUG-DJANGO-015).
 *
 * - `cloudinary.config()` se llama **una sola vez** al arrancar, no por request.
 * - Carpeta **por entorno**: `padres` en produccion; `development/padres`, `test/padres`
 *   fuera, para no mezclar subidas.
 * - Sin credenciales -> `upload()` lanza 503 (en prod siempre hay credenciales).
 */
@Injectable()
export class CloudinaryService implements OnModuleInit {
  private readonly logger = new Logger(CloudinaryService.name);
  private configured = false;
  private folderPrefix = '';

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const creds = this.config.getOrThrow<Config['cloudinary']>(
      'app-config.cloudinary',
    );
    const nodeEnv = this.config.getOrThrow<Config['app']['nodeEnv']>(
      'app-config.app.nodeEnv',
    );
    this.folderPrefix = nodeEnv === 'production' ? '' : `${nodeEnv}/`;

    if (creds.configured) {
      cloudinary.config({
        cloud_name: creds.cloudName,
        api_key: creds.apiKey,
        api_secret: creds.apiSecret,
        secure: true,
      });
      this.configured = true;
      this.logger.log('Cloudinary configurado');
    } else {
      this.logger.warn(
        'Cloudinary sin credenciales: las subidas de archivos daran 503',
      );
    }
  }

  async upload(
    file: Buffer,
    options: CloudinaryUploadOptions,
  ): Promise<CloudinaryUploadResult> {
    if (!this.configured) {
      throw new ServiceUnavailableException({
        detail: 'El servicio de archivos no esta disponible.',
      });
    }

    const folder = `${this.folderPrefix}${options.folder}`;
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder,
            resource_type: options.resourceType ?? 'image',
            use_filename: true,
            unique_filename: false,
          },
          (error, response) => {
            if (error || !response) {
              reject(
                error instanceof Error
                  ? error
                  : new Error('Cloudinary no devolvio respuesta'),
              );
              return;
            }
            resolve(response);
          },
        )
        .end(file);
    });

    return { secureUrl: result.secure_url, publicId: result.public_id };
  }
}
