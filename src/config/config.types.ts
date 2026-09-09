export type NodeEnv = 'development' | 'production' | 'test';

export interface AppConfig {
  nodeEnv: NodeEnv;
  port: number;
}

export interface DatabaseConfig {
  url: string;
  ssl: boolean;
}

export interface JwtConfig {
  secret: string;
  accessTtl: string;
  refreshTtl: string;
}

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  /** true solo si las 3 credenciales estan presentes. */
  configured: boolean;
}

export interface CorsConfig {
  /** Origenes permitidos; vacio = sin CORS cross-origin. */
  origins: string[];
}

export type LogLevel =
  'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';

export const LOG_LEVELS: LogLevel[] = [
  'fatal',
  'error',
  'warn',
  'info',
  'debug',
  'trace',
  'silent',
];

export interface LogConfig {
  level: LogLevel;
}

export interface Config {
  app: AppConfig;
  database: DatabaseConfig;
  jwt: JwtConfig;
  cloudinary: CloudinaryConfig;
  cors: CorsConfig;
  log: LogConfig;
}
