import { BadRequestException } from '@nestjs/common';
import type { UploadedImage } from './image-file.validator';

export const DOCUMENT_MAX_BYTES = 20 * 1024 * 1024;

/** Firma por *magic bytes* de los formatos que Django permite (`validar_documento`: PDF/PPT/PPTX). */
const SIGNATURES: ReadonlyArray<(b: Buffer) => boolean> = [
  // PDF: "%PDF"
  (b) => b.length >= 4 && b.subarray(0, 4).toString('latin1') === '%PDF',
  // PPT (OLE2 / Compound File Binary): D0 CF 11 E0 A1 B1 1A E1
  (b) =>
    b.length >= 8 &&
    b
      .subarray(0, 8)
      .equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])),
  // PPTX (OOXML = ZIP): "PK" 03 04 / 05 06 / 07 08
  (b) =>
    b.length >= 4 &&
    b[0] === 0x50 &&
    b[1] === 0x4b &&
    (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07) &&
    (b[3] === 0x04 || b[3] === 0x06 || b[3] === 0x08),
];

/**
 * Valida un documento subido: **tipo por contenido** (PDF/PPT/PPTX) + tamano <= 20 MB.
 * Django (prod) solo mira extension y mimetype adivinado (falseables); esto es un
 * endurecimiento consciente (SECURITY-008). Falla -> 400 `{ "<campo>": ["..."] }`.
 */
export function assertValidDocument(
  file: UploadedImage,
  field = 'document',
): void {
  const errors: string[] = [];

  if (file.size > DOCUMENT_MAX_BYTES) {
    errors.push(
      `El archivo supera el limite de ${DOCUMENT_MAX_BYTES / (1024 * 1024)} MB.`,
    );
  }
  if (!SIGNATURES.some((test) => test(file.buffer))) {
    errors.push('El archivo no es un documento valido (PDF, PPT o PPTX).');
  }

  if (errors.length > 0) {
    throw new BadRequestException({ [field]: errors });
  }
}
