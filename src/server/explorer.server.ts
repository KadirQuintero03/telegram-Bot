import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import compression from 'compression';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { Telegraf } from 'telegraf';
import { config } from '../config/env.js';
import { BotContext } from '../types/bot.types.js';
import { accessCodeService } from '../services/access-code.service.js';
import { photosService } from '../photos/index.js';

const BASE_STORAGE_PATH = path.resolve(config.filesStoragePath);
const THUMBNAIL_CACHE_DIR = path.resolve(BASE_STORAGE_PATH, '.thumbnails');

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif']);
const MEDIA_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg',
  '.mp4', '.mov', '.webm', '.mkv', '.avi'
]);

interface ExplorerEntry {
  name: string;
  type: 'directory' | 'file';
  path: string;
  size?: number;
  modifiedAt?: number;
}

function resolveSafePath(owner: string, relativePath: string): string {
  if (!owner || /[/\\]/.test(owner)) {
    throw new Error('Usuario (owner) inválido.');
  }

  const ownerRoot = path.resolve(BASE_STORAGE_PATH, owner);
  if (!ownerRoot.startsWith(BASE_STORAGE_PATH) || !fs.existsSync(ownerRoot)) {
    throw new Error('El usuario no tiene una carpeta asociada.');
  }

  const cleaned = (relativePath ?? '').replace(/^[/\\]+/, '');
  const candidate = path.resolve(ownerRoot, cleaned);

  if (!candidate.startsWith(ownerRoot)) {
    throw new Error('Ruta inválida.');
  }
  return candidate;
}

function toRelative(ownerRoot: string, absolutePath: string): string {
  return path.relative(ownerRoot, absolutePath).split(path.sep).join('/');
}

function extractToken(req: Request): string {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  return ((req.query.token as string) ?? '').trim();
}

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const owner = ((req.query.owner as string) ?? (req.body?.owner as string) ?? '').trim();
  const token = extractToken(req);

  if (!token) {
    res.status(401).json({ error: 'Acceso no autorizado. Debes proporcionar un token de sesión.' });
    return;
  }

  const isValid = accessCodeService.verifySessionToken(token, owner);
  if (!isValid) {
    res.status(401).json({ error: 'Token de sesión inválido o expirado. Inicia sesión nuevamente.' });
    return;
  }

  next();
}

async function getOrCreateThumbnail(owner: string, relativePath: string, targetPath: string, width = 320): Promise<string | null> {
  // 1. Si existe miniatura pre-guardada de Telegram (ej. de video: file.mp4.thumb.jpg)
  const companionThumb = `${targetPath}.thumb.jpg`;
  if (fs.existsSync(companionThumb)) {
    return companionThumb;
  }

  const ext = path.extname(targetPath).toLowerCase();
  // 2. Si no es imagen procesable por sharp, retornar null
  if (!IMAGE_EXTENSIONS.has(ext)) {
    return null;
  }

  try {
    const stat = await fs.promises.stat(targetPath);
    const safeKey = `${owner}_${relativePath.replace(/[\/\\:]/g, '_')}_${stat.mtimeMs}_${width}.webp`;
    const cachePath = path.join(THUMBNAIL_CACHE_DIR, safeKey);

    if (fs.existsSync(cachePath)) {
      return cachePath;
    }

    await fs.promises.mkdir(THUMBNAIL_CACHE_DIR, { recursive: true });

    await sharp(targetPath)
      .resize(width, width, { fit: 'cover', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(cachePath);

    return cachePath;
  } catch (err) {
    console.warn(`[ExplorerServer] Error generando miniatura con sharp para ${targetPath}:`, err);
    return null;
  }
}

async function scanMediaRecursively(dir: string, ownerRoot: string, maxDepth = 4, depth = 0): Promise<ExplorerEntry[]> {
  if (depth > maxDepth) return [];
  const entries: ExplorerEntry[] = [];

  try {
    const items = await fs.promises.readdir(dir, { withFileTypes: true });

    for (const item of items) {
      if (item.name.startsWith('.')) continue;
      const fullPath = path.join(dir, item.name);

      if (item.isDirectory()) {
        const sub = await scanMediaRecursively(fullPath, ownerRoot, maxDepth, depth + 1);
        entries.push(...sub);
      } else if (item.isFile()) {
        if (item.name.endsWith('.thumb.jpg')) continue;
        const ext = path.extname(item.name).toLowerCase();
        if (MEDIA_EXTENSIONS.has(ext)) {
          const stat = await fs.promises.stat(fullPath);
          entries.push({
            name: item.name,
            type: 'file',
            path: toRelative(ownerRoot, fullPath),
            size: stat.size,
            modifiedAt: stat.mtimeMs,
          });
        }
      }
    }
  } catch {
    // Ignorar directorios no accesibles
  }

  return entries;
}

export function createExplorerServer(bot: Telegraf<BotContext>): Express {
  accessCodeService.setBot(bot);

  const app = express();

  app.use(cors({ origin: '*' }));
  app.use(compression());
  app.use(express.json());

  app.post('/auth/request-code', async (req: Request, res: Response) => {
    const phone = (req.body?.phone as string) ?? '';

    if (!phone.trim()) {
      return res.status(400).json({ error: 'Debes indicar un número de teléfono.' });
    }

    try {
      const result = await accessCodeService.requestCode(phone);
      res.json({ success: true, sentTo: result.maskedPhone });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      console.error(`[AuthServer] /auth/request-code: ${msg}`);
      res.status(400).json({ error: msg });
    }
  });

  app.post('/auth/verify-code', (req: Request, res: Response) => {
    const phone = (req.body?.phone as string) ?? '';
    const code = (req.body?.code as string) ?? '';

    if (!phone.trim() || !code.trim()) {
      return res.status(400).json({ error: 'Debes indicar el teléfono y el código.' });
    }

    try {
      const result = accessCodeService.verifyCode(phone, code);
      res.json({ success: true, owner: result.folderName, token: result.token });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      console.error(`[AuthServer] /auth/verify-code: ${msg}`);
      res.status(400).json({ error: msg });
    }
  });

  app.get('/explorer', requireAuth, async (req: Request, res: Response) => {
    const owner = (req.query.owner as string) ?? '';
    const relativePath = (req.query.path as string) ?? '';

    if (!owner) {
      return res.status(400).json({ error: 'Falta identificar al usuario (owner).' });
    }

    try {
      const ownerRoot = path.resolve(BASE_STORAGE_PATH, owner);
      if (relativePath.toLowerCase() === 'albumes' || relativePath.toLowerCase() === 'album') {
        await photosService.ensureAlbumsDirectory(owner).catch(() => {});
      }
      const target = resolveSafePath(owner, relativePath);

      const targetStat = await fs.promises.stat(target).catch(() => null);
      if (!targetStat) {
        return res.status(404).json({ error: 'Directorio no encontrado' });
      }
      if (!targetStat.isDirectory()) {
        return res.status(400).json({ error: 'La ruta no es un directorio' });
      }

      const dirEntries = await fs.promises.readdir(target, { withFileTypes: true });

      const filtered = dirEntries.filter(
        (dirent) => !dirent.name.startsWith('.') && !dirent.name.endsWith('.thumb.jpg')
      );

      const entries: ExplorerEntry[] = await Promise.all(
        filtered.map(async (dirent) => {
          const entryAbsolutePath = path.join(target, dirent.name);
          const entryRelativePath = toRelative(ownerRoot, entryAbsolutePath);

          if (dirent.isDirectory()) {
            return {
              name: dirent.name,
              type: 'directory',
              path: entryRelativePath,
            };
          }

          const stat = await fs.promises.stat(entryAbsolutePath);
          return {
            name: dirent.name,
            type: 'file',
            path: entryRelativePath,
            size: stat.size,
            modifiedAt: stat.mtimeMs,
          };
        })
      );

      entries.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      res.setHeader('Cache-Control', 'private, no-cache');
      res.json({
        currentPath: relativePath,
        entries,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Ruta inválida';
      console.error('[ExplorerServer] Error al listar directorio:', msg);
      res.status(400).json({ error: msg });
    }
  });

  app.get('/explorer/gallery', requireAuth, async (req: Request, res: Response) => {
    const owner = (req.query.owner as string) ?? '';

    if (!owner) {
      return res.status(400).json({ error: 'Falta identificar al usuario (owner).' });
    }

    try {
      const ownerRoot = path.resolve(BASE_STORAGE_PATH, owner);
      if (!ownerRoot.startsWith(BASE_STORAGE_PATH) || !fs.existsSync(ownerRoot)) {
        return res.status(404).json({ error: 'El usuario no tiene una carpeta asociada.' });
      }

      const media = await scanMediaRecursively(ownerRoot, ownerRoot);
      media.sort((a, b) => (b.modifiedAt ?? 0) - (a.modifiedAt ?? 0));

      res.setHeader('Cache-Control', 'private, no-cache');
      res.json({
        currentPath: '',
        entries: media,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error al recopilar la galería';
      console.error('[ExplorerServer] Error en /explorer/gallery:', msg);
      res.status(500).json({ error: msg });
    }
  });

  app.get('/explorer/videos', requireAuth, async (req: Request, res: Response) => {
    const owner = (req.query.owner as string) ?? '';

    if (!owner) {
      return res.status(400).json({ error: 'Falta identificar al usuario (owner).' });
    }

    try {
      const videos = await photosService.listVideos(owner);
      res.setHeader('Cache-Control', 'private, no-cache');
      res.json({
        currentPath: '',
        entries: videos,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error al listar los vídeos';
      console.error('[ExplorerServer] Error en /explorer/videos:', msg);
      res.status(500).json({ error: msg });
    }
  });

  app.get('/explorer/recent', requireAuth, async (req: Request, res: Response) => {
    const owner = (req.query.owner as string) ?? '';
    const hours = parseInt((req.query.hours as string) || '24', 10);

    if (!owner) {
      return res.status(400).json({ error: 'Falta identificar al usuario (owner).' });
    }

    try {
      const recent = await photosService.listRecent(owner, Number.isNaN(hours) ? 24 : hours);
      res.setHeader('Cache-Control', 'private, no-cache');
      res.json({
        currentPath: '',
        entries: recent,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error al listar archivos recientes';
      console.error('[ExplorerServer] Error en /explorer/recent:', msg);
      res.status(500).json({ error: msg });
    }
  });

  app.get('/explorer/albums', requireAuth, async (req: Request, res: Response) => {
    const owner = (req.query.owner as string) ?? '';

    if (!owner) {
      return res.status(400).json({ error: 'Falta identificar al usuario (owner).' });
    }

    try {
      const albums = await photosService.listAlbums(owner);
      res.setHeader('Cache-Control', 'private, no-cache');
      res.json({
        currentPath: 'Albumes',
        entries: albums,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error al listar álbumes';
      console.error('[ExplorerServer] Error en /explorer/albums:', msg);
      res.status(500).json({ error: msg });
    }
  });

  app.post('/explorer/albums', requireAuth, async (req: Request, res: Response) => {
    const owner = ((req.body?.owner as string) ?? (req.query.owner as string) ?? '').trim();
    const title = ((req.body?.title as string) ?? '').trim();

    if (!owner || !title) {
      return res.status(400).json({ error: 'Debes proporcionar el owner y el título del álbum.' });
    }

    try {
      const created = await photosService.createAlbum(owner, title);
      console.info(`[ExplorerServer] Álbum creado exitosamente: "${title}" para owner "${owner}"`);
      res.status(201).json(created);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error al crear el álbum';
      console.error('[ExplorerServer] Error en POST /explorer/albums:', msg);
      res.status(400).json({ error: msg });
    }
  });

  app.get('/explorer/thumbnail', requireAuth, async (req: Request, res: Response) => {
    const owner = (req.query.owner as string) ?? '';
    const relativePath = (req.query.path as string) ?? '';
    const width = Math.min(Math.max(parseInt((req.query.w as string) || '320', 10), 80), 800);

    if (!owner || !relativePath) {
      return res.status(400).json({ error: 'Falta identificar usuario y ruta.' });
    }

    try {
      const target = resolveSafePath(owner, relativePath);
      const targetStat = await fs.promises.stat(target).catch(() => null);

      if (!targetStat || !targetStat.isFile()) {
        return res.status(404).json({ error: 'Archivo no encontrado' });
      }

      const thumbPath = await getOrCreateThumbnail(owner, relativePath, target, width);
      if (!thumbPath || !fs.existsSync(thumbPath)) {
        // Fallback: si es imagen pequeña podemos servir el original o devolver 404
        const ext = path.extname(target).toLowerCase();
        if (IMAGE_EXTENSIONS.has(ext)) {
          res.setHeader('Cache-Control', 'public, max-age=86400');
          return res.sendFile(target);
        }
        return res.status(404).json({ error: 'Miniatura no disponible' });
      }

      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.sendFile(thumbPath);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error al obtener miniatura';
      console.error('[ExplorerServer] Error en /explorer/thumbnail:', msg);
      res.status(500).json({ error: msg });
    }
  });

  app.get('/explorer/file', requireAuth, async (req: Request, res: Response) => {
    const owner = (req.query.owner as string) ?? '';
    const relativePath = (req.query.path as string) ?? '';

    if (!owner) {
      return res.status(400).json({ error: 'Falta identificar al usuario (owner).' });
    }

    try {
      const target = resolveSafePath(owner, relativePath);
      const targetStat = await fs.promises.stat(target).catch(() => null);

      if (!targetStat || !targetStat.isFile()) {
        return res.status(404).json({ error: 'Archivo no encontrado' });
      }

      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.sendFile(target);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Ruta inválida';
      console.error('[ExplorerServer] Error al servir archivo:', msg);
      res.status(400).json({ error: msg });
    }
  });

  app.post('/explorer/delete', requireAuth, async (req: Request, res: Response) => {
    const owner = ((req.body?.owner as string) ?? (req.query.owner as string) ?? '').trim();
    const relativePath = ((req.body?.path as string) ?? (req.query.path as string) ?? '').trim();

    if (!owner || !relativePath) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos (owner y path).' });
    }

    try {
      const target = resolveSafePath(owner, relativePath);
      const targetStat = await fs.promises.stat(target).catch(() => null);

      if (!targetStat) {
        return res.status(404).json({ error: 'El archivo o directorio no existe.' });
      }

      if (targetStat.isDirectory()) {
        await fs.promises.rm(target, { recursive: true, force: true });
      } else {
        await fs.promises.unlink(target);
        // Eliminar miniatura asociada si existe
        const companionThumb = `${target}.thumb.jpg`;
        if (fs.existsSync(companionThumb)) {
          await fs.promises.unlink(companionThumb).catch(() => {});
        }
      }

      console.info(`[ExplorerServer] Eliminado con éxito: ${target}`);
      res.json({ success: true, message: 'Elemento eliminado correctamente.' });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error al eliminar el archivo';
      console.error('[ExplorerServer] Error en /explorer/delete:', msg);
      res.status(500).json({ error: msg });
    }
  });

  return app;
}
