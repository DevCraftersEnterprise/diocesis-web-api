import { PasswordService } from './password.service';

/**
 * Vectores PBKDF2 en formato Django, generados con el mismo algoritmo que
 * `django.contrib.auth.hashers.PBKDF2PasswordHasher`
 * (`hashlib.pbkdf2_hmac('sha256', pw, salt, iter)` + base64). NO son hashes reales.
 */
const DJANGO_VECTORS = [
  {
    password: 'correct horse battery staple',
    hash: 'pbkdf2_sha256$260000$abcdEFGH1234$eQgaTbS1pLyXZQYz7qaV08eJAj+bDyAnhRgnE1DEXcU=',
  },
  {
    password: 'p@ssw0rd',
    hash: 'pbkdf2_sha256$600000$xyz789salt00$PXYzi2uHDi76oUmqk6J2xpvgxLodqIvOkFXjpWO+Zoo=',
  },
  {
    password: 'contraseña-ñ-é',
    hash: 'pbkdf2_sha256$320000$saltUnicode1$TucnX3L7gBbtr+bg6prKhVyCJxe3PSbTzO6t9cr/WlI=',
  },
];

describe('PasswordService', () => {
  const service = new PasswordService();

  describe('verify() contra hashes PBKDF2 de Django', () => {
    it.each(DJANGO_VECTORS)(
      'acepta la contrasena correcta y pide rehash ($password)',
      async ({ password, hash }) => {
        const res = await service.verify(password, hash);
        expect(res).toEqual({ valid: true, needsRehash: true });
      },
    );

    it('rechaza la contrasena incorrecta', async () => {
      const res = await service.verify('otra-cosa', DJANGO_VECTORS[0].hash);
      expect(res).toEqual({ valid: false, needsRehash: false });
    });

    it('rechaza un hash PBKDF2 malformado', async () => {
      const res = await service.verify(
        'x',
        'pbkdf2_sha256$notanumber$salt$hash',
      );
      expect(res.valid).toBe(false);
    });
  });

  describe('hash() + verify() con argon2id', () => {
    it('produce un hash argon2id verificable, sin pedir rehash', async () => {
      const hash = await service.hash('un-secreto');
      expect(hash.startsWith('$argon2id$')).toBe(true);

      const ok = await service.verify('un-secreto', hash);
      expect(ok).toEqual({ valid: true, needsRehash: false });

      const bad = await service.verify('mal', hash);
      expect(bad).toEqual({ valid: false, needsRehash: false });
    });

    it('cada hash usa una sal distinta', async () => {
      const [a, b] = await Promise.all([
        service.hash('igual'),
        service.hash('igual'),
      ]);
      expect(a).not.toBe(b);
    });
  });

  it('rechaza un formato de hash desconocido sin lanzar', async () => {
    expect(await service.verify('x', 'md5$deadbeef')).toEqual({
      valid: false,
      needsRehash: false,
    });
  });
});
