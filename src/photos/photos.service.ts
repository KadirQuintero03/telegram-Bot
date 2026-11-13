import fs from 'fs';
import path from 'path';
import { config } from '../config/env.js';
import { PhotosEntry } from './photos.types.js';

const VIDEO_EXTENSIONS = new Set([
  '.mp4', '.mov', '.webm', '.mkv', '.avi', '.3gp', '.wmv', '.flv', '.m4v', '.ogv'
]);

export class PhotosService {
  private baseStoragePath: string;

  constructor() {
    this.baseStoragePath = path.resolve(config.filesStoragePath);
  }

  resolveUserRoot(owner: string): string {
    if (!owner || /[/\\]/.test(owner) || owner.includes('..')) {
      throw new Error('Identificador de usuario (owner) inválido.');
    }

    const ownerRoot = path.resolve(this.baseStoragePath, owner);
    if (!ownerRoot.startsWith(this.baseStoragePath) || !fs.existsSync(ownerRoot)) {
      throw new Error('El usuario no tiene una carpeta de almacenamiento asociada.');
    }

    return ownerRoot;
  }

  private toRelative(ownerRoot: string, absolutePath: string): string {
    return path.relative(ownerRoot, absolutePath).split(path.sep).join('/');
  }

  async ensureAlbumsDirectory(owner: string): Promise<string> {
    const ownerRoot = this.resolveUserRoot(owner);
    const albumsDir = path.join(ownerRoot, 'Albumes');
    if (!fs.existsSync(albumsDir)) {
      await fs.promises.mkdir(albumsDir, { recursive: true });
    }
    return albumsDir;
  }

  async listAlbums(owner: string): Promise<PhotosEntry[]> {
    const ownerRoot = this.resolveUserRoot(owner);
    const albumsDir = await this.ensureAlbumsDirectory(owner);

    const items = await fs.promises.readdir(albumsDir, { withFileTypes: true });
    const entries: PhotosEntry[] = [];

    for (const item of items) {
      if (item.name.startsWith('.')) continue;
      if (item.isDirectory()) {
        const fullPath = path.join(albumsDir, item.name);
        const stat = await fs.promises.stat(fullPath);
        entries.push({
          name: item.name,
          type: 'directory',
          path: this.toRelative(ownerRoot, fullPath),
          modifiedAt: stat.mtimeMs,
        });
      }
    }

    entries.sort((a, b) => a.name.localeCompare(b.name));
    return entries;
  }

  async createAlbum(owner: string, title: string): Promise<PhotosEntry> {
    const rawTitle = (title ?? '').trim();
    if (!rawTitle) {
      throw new Error('Debes indicar un título para el álbum.');
    }

    const sanitizedTitle = rawTitle.replace(/[\\/:*?"<>|]/g, '_').replace(/\.\.+/g, '.').trim();
    if (!sanitizedTitle) {
      throw new Error('El título del álbum contiene caracteres no permitidos.');
    }

    const ownerRoot = this.resolveUserRoot(owner);
    const albumsDir = await this.ensureAlbumsDirectory(owner);
    const targetDir = path.join(albumsDir, sanitizedTitle);

    if (fs.existsSync(targetDir)) {
      throw new Error(`Ya existe un álbum con el nombre "${sanitizedTitle}".`);
    }

    await fs.promises.mkdir(targetDir, { recursive: true });
    const stat = await fs.promises.stat(targetDir);

    return {
      name: sanitizedTitle,
      type: 'directory',
      path: this.toRelative(ownerRoot, targetDir),
      modifiedAt: stat.mtimeMs,
    };
  }

  async listVideos(owner: string): Promise<PhotosEntry[]> {
    const ownerRoot = this.resolveUserRoot(owner);
    const videos: PhotosEntry[] = [];

    await this.scanVideosRecursively(ownerRoot, ownerRoot, videos);
    videos.sort((a, b) => (b.modifiedAt ?? 0) - (a.modifiedAt ?? 0));
    return videos;
  }

  private async scanVideosRecursively(
    currentDir: string,
    ownerRoot: string,
    acc: PhotosEntry[],
    maxDepth = 5,
    depth = 0
  ): Promise<void> {
    if (depth > maxDepth) return;

    try {
      const items = await fs.promises.readdir(currentDir, { withFileTypes: true });

      for (const item of items) {
        if (item.name.startsWith('.') || item.name === '.thumbnails') continue;
        const fullPath = path.join(currentDir, item.name);

        if (item.isDirectory()) {
          await this.scanVideosRecursively(fullPath, ownerRoot, acc, maxDepth, depth + 1);
        } else if (item.isFile()) {
          if (item.name.endsWith('.thumb.jpg')) continue;
          const ext = path.extname(item.name).toLowerCase();
          if (VIDEO_EXTENSIONS.has(ext)) {
            const stat = await fs.promises.stat(fullPath);
            acc.push({
              name: item.name,
              type: 'file',
              path: this.toRelative(ownerRoot, fullPath),
              size: stat.size,
              modifiedAt: stat.mtimeMs,
            });
          }
        }
      }
    } catch {
      // Ignorar directorios no legibles
    }
  }

  async listRecent(owner: string, maxHours = 24): Promise<PhotosEntry[]> {
    const ownerRoot = this.resolveUserRoot(owner);
    const recent: PhotosEntry[] = [];
    const thresholdMs = Date.now() - maxHours * 60 * 60 * 1000;

    await this.scanRecentRecursively(ownerRoot, ownerRoot, thresholdMs, recent);
    recent.sort((a, b) => (b.modifiedAt ?? 0) - (a.modifiedAt ?? 0));
    return recent;
  }

  private async scanRecentRecursively(
    currentDir: string,
    ownerRoot: string,
    thresholdMs: number,
    acc: PhotosEntry[],
    maxDepth = 5,
    depth = 0
  ): Promise<void> {
    if (depth > maxDepth) return;

    try {
      const items = await fs.promises.readdir(currentDir, { withFileTypes: true });

      for (const item of items) {
        if (item.name.startsWith('.') || item.name === '.thumbnails') continue;
        const fullPath = path.join(currentDir, item.name);

        if (item.isDirectory()) {
          await this.scanRecentRecursively(fullPath, ownerRoot, thresholdMs, acc, maxDepth, depth + 1);
        } else if (item.isFile()) {
          if (item.name.endsWith('.thumb.jpg')) continue;
          const stat = await fs.promises.stat(fullPath);
          if (stat.mtimeMs >= thresholdMs) {
            acc.push({
              name: item.name,
              type: 'file',
              path: this.toRelative(ownerRoot, fullPath),
              size: stat.size,
              modifiedAt: stat.mtimeMs,
            });
          }
        }
      }
    } catch {
      // Ignorar directorios no legibles
    }
  }
}

export const photosService = new PhotosService();
