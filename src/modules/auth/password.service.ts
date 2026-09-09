import { pbkdf2Sync, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

export interface PasswordVerifyResult {
  /** La contrasena coincide con el hash almacenado. */
  valid: boolean;
  /** El hash es de un formato heredado (PBKDF2 de Django) y debe re-hashearse a argon2id. */
  needsRehash: boolean;
}

const DJANGO_PBKDF2 = /^pbkdf2_sha256\$(\d+)\$([^$]+)\$(.+)$/;
const ARGON2_OPTIONS = { type: argon2.argon2id } as const;

/**
 * Hashing y verificacion de contrasenas (ADR-002 pto. 4).
 *
 * - `hash()` -> siempre **argon2id**.
 * - `verify()` acepta tanto argon2id (`$argon2id$...`) como el formato heredado de Django
 *   (`pbkdf2_sha256$<iter>$<salt>$<hash_b64>`), leyendo iteraciones y salt del propio hash.
 *   Un verify correcto sobre un hash PBKDF2 marca `needsRehash: true`: el llamador
 *   (AuthService, en el primer login) re-hashea con argon2id y persiste.
 */
@Injectable()
export class PasswordService {
  hash(plain: string): Promise<string> {
    return argon2.hash(plain, ARGON2_OPTIONS);
  }

  async verify(plain: string, stored: string): Promise<PasswordVerifyResult> {
    if (stored.startsWith('$argon2')) {
      const valid = await argon2.verify(stored, plain).catch(() => false);
      return { valid, needsRehash: false };
    }

    if (stored.startsWith('pbkdf2_sha256$')) {
      const valid = this.verifyDjangoPbkdf2(plain, stored);
      return { valid, needsRehash: valid };
    }

    return { valid: false, needsRehash: false };
  }

  /** Verificador PBKDF2-SHA256 compatible con `django.contrib.auth.hashers`. */
  private verifyDjangoPbkdf2(plain: string, stored: string): boolean {
    const match = DJANGO_PBKDF2.exec(stored);
    if (!match) return false;

    const iterations = Number.parseInt(match[1], 10);
    const salt = match[2];
    const expected = Buffer.from(match[3], 'base64');
    if (
      !Number.isInteger(iterations) ||
      iterations <= 0 ||
      expected.length === 0
    ) {
      return false;
    }

    const actual = pbkdf2Sync(
      plain,
      salt,
      iterations,
      expected.length,
      'sha256',
    );
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  }
}
