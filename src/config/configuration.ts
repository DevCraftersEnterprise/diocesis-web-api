import { registerAs } from '@nestjs/config';
import type { Config } from './config.types';
import { validateEnv } from './env.validation';

/** Namespace bajo el que se registra la config: `configService.get('app-config...')`. */
export const CONFIG_NAMESPACE = 'app-config';

export const configuration = registerAs(CONFIG_NAMESPACE, (): Config => {
  const env = validateEnv(process.env);

  const origins = env.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  return {
    app: { nodeEnv: env.NODE_ENV, port: env.PORT },
    database: { url: env.DATABASE_URL, ssl: env.DATABASE_SSL },
    jwt: {
      secret: env.JWT_SECRET,
      accessTtl: env.JWT_ACCESS_TTL,
      refreshTtl: env.JWT_REFRESH_TTL,
    },
    cloudinary: {
      cloudName: env.CLOUDINARY_CLOUD_NAME,
      apiKey: env.CLOUDINARY_API_KEY,
      apiSecret: env.CLOUDINARY_API_SECRET,
      configured: Boolean(
        env.CLOUDINARY_CLOUD_NAME &&
        env.CLOUDINARY_API_KEY &&
        env.CLOUDINARY_API_SECRET,
      ),
    },
    cors: { origins },
    log: { level: env.LOG_LEVEL },
    throttle: {
      authLimit: env.THROTTLE_AUTH_LIMIT,
      authTtlMs: env.THROTTLE_AUTH_TTL_MS,
    },
  };
});
