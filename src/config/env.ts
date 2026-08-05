import dotenv from 'dotenv';
import path from 'path';

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
  
  filesStoragePath: path.resolve(process.env['FILES_STORAGE_PATH'] ?? './filesBotTelegram'),
  
  
  
  
  
  
  registryStoragePath: path.resolve(process.env['REGISTRY_STORAGE_PATH'] ?? './data'),
  tiktokDownloaderBaseUrl: (process.env['TIKTOK_DOWNLOADER_BASE_URL'] ?? '').trim(),
  instagramDownloaderBaseUrl: (process.env['INSTAGRAM_DOWNLOADER_URL'] ?? '').trim(),
  youtubeDownloaderBaseUrl: (process.env['YOUTUBE_DOWNLOADER_URL'] ?? '').trim(),
  emailHost: requireEnv('EMAIL_HOST'),
  emailPort: parseInt(process.env['EMAIL_PORT'] ?? '587', 10),
  emailUser: requireEnv('EMAIL_USER'),
  emailPass: requireEnv('EMAIL_PASS'),
  
  
  
  geminiApiKey: (process.env['GEMINI_API_KEY'] ?? '').trim(),
  geminiModel: (process.env['GEMINI_MODEL'] ?? 'gemini-3.1-flash-lite').trim(),
};