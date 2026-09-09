import { Logger, ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryService } from './cloudinary.service';

jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: { upload_stream: jest.fn() },
  },
}));

function makeConfig(configured: boolean, nodeEnv = 'test') {
  return {
    getOrThrow: (key: string) =>
      key === 'app-config.cloudinary'
        ? {
            cloudName: 'cn',
            apiKey: 'k',
            apiSecret: 's',
            configured,
          }
        : nodeEnv,
  } as unknown as ConfigService;
}

describe('CloudinaryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });
  afterEach(() => jest.restoreAllMocks());

  it('sin credenciales -> upload() lanza 503 y no llama al SDK', async () => {
    const svc = new CloudinaryService(makeConfig(false));
    svc.onModuleInit();

    await expect(
      svc.upload(Buffer.from('x'), { folder: 'padres' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(cloudinary.config).not.toHaveBeenCalled();
  });

  it('con credenciales -> configura el SDK una vez y antepone la carpeta por entorno', async () => {
    const svc = new CloudinaryService(makeConfig(true, 'test'));
    svc.onModuleInit();
    expect(cloudinary.config).toHaveBeenCalledTimes(1);

    (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation(
      (opts: { folder: string }, cb: (e: unknown, r: unknown) => void) => {
        expect(opts.folder).toBe('test/padres');
        return {
          end: () =>
            cb(null, {
              secure_url: 'https://cdn/x.jpg',
              public_id: 'test/padres/x',
            }),
        };
      },
    );

    const res = await svc.upload(Buffer.from('img'), { folder: 'padres' });
    expect(res).toEqual({
      secureUrl: 'https://cdn/x.jpg',
      publicId: 'test/padres/x',
    });
  });

  it('en produccion la carpeta no lleva prefijo', async () => {
    const svc = new CloudinaryService(makeConfig(true, 'production'));
    svc.onModuleInit();
    (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation(
      (opts: { folder: string }, cb: (e: unknown, r: unknown) => void) => {
        expect(opts.folder).toBe('padres');
        return {
          end: () => cb(null, { secure_url: 'u', public_id: 'padres/x' }),
        };
      },
    );
    await svc.upload(Buffer.from('img'), { folder: 'padres' });
  });
});
