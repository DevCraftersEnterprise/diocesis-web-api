import { randomUUID } from 'node:crypto';
import type { Repository } from 'typeorm';
import { PasswordService } from './../../src/modules/auth/password.service';
import type {
  Usuario,
  UserRole,
} from './../../src/modules/users/entities/usuario.entity';

const passwords = new PasswordService();

export interface SeededUser {
  id: string;
  username: string;
  password: string;
  role: UserRole;
}

/** Inserta un usuario de prueba (hash argon2id) y devuelve sus credenciales. */
export async function seedUser(
  repo: Repository<Usuario>,
  overrides: Partial<SeededUser> & { role?: UserRole } = {},
): Promise<SeededUser> {
  const id = overrides.id ?? randomUUID();
  const username = overrides.username ?? `e2e_${randomUUID().slice(0, 8)}`;
  const password = overrides.password ?? 'e2e-pass-123';
  const role = overrides.role ?? 'user';

  await repo.insert({
    id,
    username,
    email: `${username}@example.test`,
    password: await passwords.hash(password),
    role,
    isActive: true,
    isActiveAuth: true,
    isStaff: false,
    isSuperuser: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return { id, username, password, role };
}
