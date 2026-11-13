import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Variable de entorno requerida no encontrada: ${key}`);
  }
  return value;
}

export const config = {
  botToken: requireEnv('BOT_TOKEN'),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  logLevel: process.env['LOG_LEVEL'] ?? 'info',
  filesStoragePath: path.resolve(process.env['FILES_STORAGE_PATH'] ?? './filesBotTelegram'),
  registryStoragePath: path.resolve(process.env['REGISTRY_STORAGE_PATH'] ?? './data'),
  downloaderApiUrl: (process.env['DOWNLOADER_API'] ?? '').trim(),
  geminiApiKey: (process.env['GEMINI_API_KEY'] ?? '').trim(),
  geminiModel: (process.env['GEMINI_MODEL'] ?? 'gemini-3.1-flash-lite').trim(),
  explorerPort: parseInt(process.env['EXPLORER_PORT'] ?? '3050', 10),
};
