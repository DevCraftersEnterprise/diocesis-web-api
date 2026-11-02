import { BadRequestException } from '@nestjs/common';
import type { UploadedImage } from './image-file.validator';

export const DOWNLOAD_MAX_BYTES = 100 * 1024 * 1024;

/**
 * Nunca se aceptan, sin importar el contenido (ejecutables/scripts: superficie de
 * ataque si alguien los descarga y los corre).
 */
const DENIED_EXTENSIONS = new Set([
  'exe',
  'msi',
  'bat',
  'cmd',
  'sh',
  'ps1',
  'vbs',
  'js',
  'jar',
  'apk',
  'dll',
  'com',
  'scr',
  'app',
  'deb',
  'rpm',
  'wsf',
  'cpl',
  'gadget',
]);

/**
 * Lista amplia (no "cualquier cosa"): documentos de oficina, imagenes, comprimidos y
 * audio/video, que es lo que pide la tarea de Descargas.
 */
const ALLOWED_EXTENSIONS = new Set([
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'odt',
  'ods',
  'odp',
  'rtf',
  'txt',
  'csv',
  'zip',
  'rar',
  '7z',
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'svg',
  'mp3',
  'wav',
  'ogg',
  'm4a',
  'mp4',
  'webm',
  'mov',
  'avi',
]);

export interface UploadedDownloadFile extends UploadedImage {
  originalname: string;
}

/**
 * Valida un archivo de Descargas: tamano <= 100 MB + extension permitida.
 *
 * A diferencia de `assertValidImage`/`assertValidDocument` (que verifican *magic
 * bytes*), aqui NO se valida el contenido por firma: la tarea pide aceptar
 * "cualquier tipo" (PDF, Word, Excel, PowerPoint, imagenes, ZIP, audio, etc.), un
 * catalogo demasiado amplio para cubrir con firmas especificas por formato. Se opta
 * por una lista de extensiones permitidas (lo que pide la tarea) + una lista negra
 * de ejecutables/scripts que nunca se aceptan, sin importar el contenido.
 */
export function assertValidDownloadFile(
  file: UploadedDownloadFile,
  field = 'file',
): void {
  const errors: string[] = [];
  const ext = (file.originalname.split('.').pop() ?? '').toLowerCase();

  if (file.size > DOWNLOAD_MAX_BYTES) {
    errors.push(
      `El archivo supera el limite de ${DOWNLOAD_MAX_BYTES / (1024 * 1024)} MB.`,
    );
  }
  if (!ext || DENIED_EXTENSIONS.has(ext) || !ALLOWED_EXTENSIONS.has(ext)) {
    errors.push('Ese tipo de archivo no esta permitido.');
  }

  if (errors.length > 0) {
    throw new BadRequestException({ [field]: errors });
  }
}
