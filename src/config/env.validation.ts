import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';
import type { NodeEnv } from './config.types';

const NODE_ENVS: NodeEnv[] = ['development', 'production', 'test'];

function toBoolean(value: unknown): boolean {
  return value === true || value === 'true' || value === '1';
}

function toPort(value: unknown): number {
  return value === undefined || value === '' ? 3000 : Number(value);
}

/** Forma cruda de `process.env` (todo strings) con validacion. */
export class EnvSchema {
  @IsOptional()
  @IsEnum(NODE_ENVS)
  NODE_ENV: NodeEnv = 'development';

  @IsOptional()
  @Transform((params) => toPort(params.value))
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 3000;

  @IsString()
  @IsNotEmpty()
  @Matches(/^postgres(ql)?:\/\//, {
    message: 'DATABASE_URL debe empezar por postgres:// o postgresql://',
  })
  DATABASE_URL!: string;

  @IsOptional()
  @Transform((params) => toBoolean(params.value))
  @IsBoolean()
  DATABASE_SSL = false;

  @IsString()
  @MinLength(16, { message: 'JWT_SECRET debe tener al menos 16 caracteres' })
  JWT_SECRET!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_TTL = '8h';

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_TTL = '1d';

  @IsOptional()
  @IsString()
  CLOUDINARY_CLOUD_NAME = '';

  @IsOptional()
  @IsString()
  CLOUDINARY_API_KEY = '';

  @IsOptional()
  @IsString()
  CLOUDINARY_API_SECRET = '';

  @IsOptional()
  @IsString()
  CORS_ORIGINS = '';
}

export function validateEnv(raw: NodeJS.ProcessEnv): EnvSchema {
  const parsed = plainToInstance(EnvSchema, raw, {
    enableImplicitConversion: false,
  });
  const errors = validateSync(parsed, { skipMissingProperties: false });
  if (errors.length > 0) {
    const details = errors
      .map((e) => Object.values(e.constraints ?? {}).join('; '))
      .join('\n  - ');
    throw new Error(`Configuracion de entorno invalida:\n  - ${details}`);
  }
  return parsed;
}
