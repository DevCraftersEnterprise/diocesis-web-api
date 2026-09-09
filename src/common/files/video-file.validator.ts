import { BadRequestException } from '@nestjs/common';
import type { UploadedImage } from './image-file.validator';

export const VIDEO_MAX_BYTES = 50 * 1024 * 1024;

/** Firma por *magic bytes* de contenedores de video. */
const SIGNATURES: ReadonlyArray<(b: Buffer) => boolean> = [
  // MP4 / QuickTime (MOV): "ftyp" en el offset 4.
  (b) => b.length >= 12 && b.subarray(4, 8).toString('latin1') === 'ftyp',
  // WebM / Matroska (EBML): 1A 45 DF A3
  (b) =>
    b.length >= 4 &&
    b[0] === 0x1a &&
    b[1] === 0x45 &&
    b[2] === 0xdf &&
    b[3] === 0xa3,
];

/**
 * Valida un video subido: **tipo por contenido** (MP4/WebM/QuickTime) + tamano <= 50 MB.
 * Django (prod) no valida nada (SECURITY-008). Falla -> 400 `{ "<campo>": ["..."] }`.
 */
export function assertValidVideo(file: UploadedImage, field = 'url'): void {
  const errors: string[] = [];

  if (file.size > VIDEO_MAX_BYTES) {
    errors.push(
      `El archivo supera el limite de ${VIDEO_MAX_BYTES / (1024 * 1024)} MB.`,
    );
  }
  if (!SIGNATURES.some((test) => test(file.buffer))) {
    errors.push('El archivo no es un video valido (MP4, WebM o QuickTime).');
  }

  if (errors.length > 0) {
    throw new BadRequestException({ [field]: errors });
  }
}
