import { BadRequestException } from '@nestjs/common';
import { IMAGE_MAX_BYTES, assertValidImage } from './image-file.validator';

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const gif = Buffer.from('GIF89a....', 'latin1');
const webp = Buffer.concat([
  Buffer.from('RIFF', 'latin1'),
  Buffer.from([0, 0, 0, 0]),
  Buffer.from('WEBP', 'latin1'),
]);
const pdf = Buffer.from('%PDF-1.4', 'latin1');

const bodyOf = (fn: () => void): Record<string, string[]> => {
  try {
    fn();
  } catch (e) {
    return (e as BadRequestException).getResponse() as Record<string, string[]>;
  }
  throw new Error('no lanzo');
};

describe('assertValidImage', () => {
  it.each([
    ['jpeg', jpeg],
    ['png', png],
    ['gif', gif],
    ['webp', webp],
  ])('acepta %s por magic bytes', (_name, buffer) => {
    expect(() =>
      assertValidImage({ buffer, size: buffer.length }),
    ).not.toThrow();
  });

  it('rechaza un tipo no permitido (PDF) -> 400 { picture: [...] }', () => {
    expect(
      bodyOf(() => assertValidImage({ buffer: pdf, size: pdf.length })),
    ).toHaveProperty('picture');
  });

  it('rechaza por tamano > 5 MB', () => {
    expect(() =>
      assertValidImage({ buffer: jpeg, size: IMAGE_MAX_BYTES + 1 }),
    ).toThrow(BadRequestException);
  });

  it('usa el nombre de campo dado', () => {
    expect(
      bodyOf(() => assertValidImage({ buffer: pdf, size: 1 }, 'url')),
    ).toHaveProperty('url');
  });
});
