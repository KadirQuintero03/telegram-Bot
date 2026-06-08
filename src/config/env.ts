import dotenv from 'dotenv';

dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`❌ Variable de entorno requerida no encontrada: ${key}`);
  }
  return value;
}

export const config = {
  botToken: requireEnv('BOT_TOKEN'),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  logLevel: process.env['LOG_LEVEL'] ?? 'info',
  maxDeleteMessages: parseInt(process.env['MAX_DELETE_MESSAGES'] ?? '100', 10),
  weatherCacheTtlMinutes: parseInt(process.env['WEATHER_CACHE_TTL_MINUTES'] ?? '10', 10),
};
