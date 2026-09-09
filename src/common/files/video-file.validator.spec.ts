import { BadRequestException } from '@nestjs/common';
import { VIDEO_MAX_BYTES, assertValidVideo } from './video-file.validator';

const mp4 = Buffer.concat([
  Buffer.from([0, 0, 0, 0x18]),
  Buffer.from('ftypisom', 'latin1'),
]);
const webm = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x02]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

describe('assertValidVideo', () => {
  it('acepta MP4/QuickTime (ftyp) y WebM (EBML)', () => {
    expect(() =>
      assertValidVideo({ buffer: mp4, size: mp4.length }),
    ).not.toThrow();
    expect(() =>
      assertValidVideo({ buffer: webm, size: webm.length }),
    ).not.toThrow();
  });

  it('rechaza una imagen -> 400 { url: [...] }', () => {
    let body: unknown;
    try {
      assertValidVideo({ buffer: png, size: png.length });
    } catch (e) {
      body = (e as BadRequestException).getResponse();
    }
    expect(body).toHaveProperty('url');
  });

  it('rechaza por tamano > 50 MB', () => {
    expect(() =>
      assertValidVideo({ buffer: mp4, size: VIDEO_MAX_BYTES + 1 }),
    ).toThrow(BadRequestException);
  });
});
