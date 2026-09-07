import { join } from 'node:path';
import type { ParityAuth } from './types';

export interface RoleCredentials {
  username: string;
  password: string;
}

export interface ParityConfig {
  /** Base del oraculo Django (sin `/api`). */
  oracleBaseUrl: string;
  /** Base de NestJS (sin `/api`). Para el auto-chequeo, apuntala tambien al oraculo. */
  nestBaseUrl: string;
  /** Prefijo que se añade a ambas bases. */
  apiPrefix: string;
  /** Carpeta de baselines grabados (gitignored: datos reales). */
  baselineDir: string;
  /** Carpeta de archivos para casos multipart. */
  filesDir: string;
  /** Credenciales por rol, si estan definidas por env. */
  credentials: Partial<Record<Exclude<ParityAuth, 'none'>, RoleCredentials>>;
}

function roleCreds(
  userVar: string,
  passVar: string,
): RoleCredentials | undefined {
  const username = process.env[userVar];
  const password = process.env[passVar];
  return username && password ? { username, password } : undefined;
}

export const config: ParityConfig = {
  oracleBaseUrl: process.env.PARITY_ORACLE_URL ?? 'http://127.0.0.1:8000',
  nestBaseUrl: process.env.PARITY_NEST_URL ?? 'http://127.0.0.1:3000',
  apiPrefix: '/api',
  baselineDir: join(__dirname, '__baselines__'),
  filesDir: join(__dirname, 'files'),
  credentials: {
    admin: roleCreds('PARITY_ADMIN_USER', 'PARITY_ADMIN_PASS'),
    super: roleCreds('PARITY_SUPER_USER', 'PARITY_SUPER_PASS'),
    user: roleCreds('PARITY_USER_USER', 'PARITY_USER_PASS'),
  },
};
