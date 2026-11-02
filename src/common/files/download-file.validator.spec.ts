import { BadRequestException } from '@nestjs/common';
import {
  assertValidDownloadFile,
  DOWNLOAD_MAX_BYTES,
} from './download-file.validator';

const file = (originalname: string, size = 100) => ({
  buffer: Buffer.alloc(size),
  size,
  originalname,
});

const bodyOf = (fn: () => void): Record<string, string[]> => {
  try {
    fn();
  } catch (e) {
    return (e as BadRequestException).getResponse() as Record<string, string[]>;
  }
  throw new Error('no lanzo');
};

describe('assertValidDownloadFile', () => {
  it.each([
    'informe.pdf',
    'contrato.docx',
    'presupuesto.xlsx',
    'presentacion.pptx',
    'foto.jpg',
    'logo.png',
    'fotos.zip',
    'audio.mp3',
    'video.mp4',
    'notas.txt',
  ])('acepta %s (extension permitida)', (name) => {
    expect(() => assertValidDownloadFile(file(name))).not.toThrow();
  });

  it.each(['virus.exe', 'script.sh', 'instalador.msi', 'macro.vbs'])(
    'rechaza %s (lista negra de ejecutables)',
    (name) => {
      expect(
        bodyOf(() => assertValidDownloadFile(file(name), 'file')),
      ).toHaveProperty('file');
    },
  );

  it('rechaza una extension desconocida', () => {
    expect(() => assertValidDownloadFile(file('archivo.xyz'))).toThrow(
      BadRequestException,
    );
  });

  it('rechaza un archivo sin extension', () => {
    expect(() => assertValidDownloadFile(file('archivo'))).toThrow(
      BadRequestException,
    );
  });

  it('rechaza por tamano > 100 MB', () => {
    expect(() =>
      assertValidDownloadFile(file('grande.pdf', DOWNLOAD_MAX_BYTES + 1)),
    ).toThrow(BadRequestException);
  });

  it('usa el nombre de campo dado', () => {
    expect(
      bodyOf(() => assertValidDownloadFile(file('x.exe'), 'archivo')),
    ).toHaveProperty('archivo');
  });
});
