import { BadRequestException } from '@nestjs/common';
import {
  DOCUMENT_MAX_BYTES,
  assertValidDocument,
} from './document-file.validator';

const pdf = Buffer.from('%PDF-1.7\n...', 'latin1');
const ppt = Buffer.from([
  0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00, 0x00,
]);
const pptx = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe('assertValidDocument', () => {
  it('acepta PDF (%PDF), PPT (OLE2) y PPTX (PK zip)', () => {
    for (const buf of [pdf, ppt, pptx]) {
      expect(() =>
        assertValidDocument({ buffer: buf, size: buf.length }),
      ).not.toThrow();
    }
  });

  it('rechaza una imagen -> 400 { document: [...] }', () => {
    let body: unknown;
    try {
      assertValidDocument({ buffer: png, size: png.length });
    } catch (e) {
      body = (e as BadRequestException).getResponse();
    }
    expect(body).toHaveProperty('document');
  });

  it('usa el campo indicado en el error', () => {
    let body: unknown;
    try {
      assertValidDocument({ buffer: png, size: png.length }, 'archivo');
    } catch (e) {
      body = (e as BadRequestException).getResponse();
    }
    expect(body).toHaveProperty('archivo');
  });

  it('rechaza por tamano > 20 MB', () => {
    expect(() =>
      assertValidDocument({ buffer: pdf, size: DOCUMENT_MAX_BYTES + 1 }),
    ).toThrow(BadRequestException);
  });
});
