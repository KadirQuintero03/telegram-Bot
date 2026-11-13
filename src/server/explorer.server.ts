import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { Telegraf } from 'telegraf';
import { config } from '../config/env.js';
import { BotContext } from '../types/bot.types.js';
import { accessCodeService } from '../services/access-code.service.js';

const BASE_STORAGE_PATH = path.resolve(config.filesStoragePath);

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
  const owner = ((req.query.owner as string) ?? '').trim();
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

export function createExplorerServer(bot: Telegraf<BotContext>): Express {
  accessCodeService.setBot(bot);

  const app = express();

  app.use(cors({ origin: '*' }));
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
      const target = resolveSafePath(owner, relativePath);

      const targetStat = await fs.promises.stat(target).catch(() => null);
      if (!targetStat) {
        return res.status(404).json({ error: 'Directorio no encontrado' });
      }
      if (!targetStat.isDirectory()) {
        return res.status(400).json({ error: 'La ruta no es un directorio' });
      }

      const dirEntries = await fs.promises.readdir(target, { withFileTypes: true });

      const entries: ExplorerEntry[] = await Promise.all(
        dirEntries.map(async (dirent) => {
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

      res.sendFile(target);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Ruta inválida';
      console.error('[ExplorerServer] Error al servir archivo:', msg);
      res.status(400).json({ error: msg });
    }
  });

  return app;
}
