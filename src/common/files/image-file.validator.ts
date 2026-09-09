import { BadRequestException } from '@nestjs/common';

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** Firma por *magic bytes* (no por mimetype, que se falsea). */
const SIGNATURES: ReadonlyArray<(b: Buffer) => boolean> = [
  // JPEG: FF D8 FF
  (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  (b) =>
    b.length >= 8 &&
    b
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  // GIF: "GIF87a" / "GIF89a"
  (b) =>
    b.length >= 6 &&
    ['GIF87a', 'GIF89a'].includes(b.subarray(0, 6).toString('latin1')),
  // WebP: "RIFF"...."WEBP"
  (b) =>
    b.length >= 12 &&
    b.subarray(0, 4).toString('latin1') === 'RIFF' &&
    b.subarray(8, 12).toString('latin1') === 'WEBP',
];

export interface UploadedImage {
  buffer: Buffer;
  size: number;
}

/**
 * Valida una imagen subida: **tipo por contenido** (JPEG/PNG/WebP/GIF) + tamano <= 5 MB.
 * Django (prod) no valida nada (SECURITY-008); esto es un endurecimiento consciente.
 * Falla -> 400 `{ "<campo>": ["..."] }` (forma DRF).
 */
export function assertValidImage(file: UploadedImage, field = 'picture'): void {
  const errors: string[] = [];

  if (file.size > IMAGE_MAX_BYTES) {
    errors.push(
      `El archivo supera el limite de ${IMAGE_MAX_BYTES / (1024 * 1024)} MB.`,
    );
  }
  if (!SIGNATURES.some((test) => test(file.buffer))) {
    errors.push('El archivo no es una imagen valida (JPEG, PNG, WebP o GIF).');
  }

  if (errors.length > 0) {
    throw new BadRequestException({ [field]: errors });
  }
}
