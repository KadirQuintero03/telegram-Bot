import fs from 'fs';
import path from 'path';
import { config } from '../config/env.js';
import { PhotosEntry, AlbumSummary } from './photos.types.js';
import { photosMetadataService } from './photos-metadata.service.js';

const VIDEO_EXTENSIONS = new Set([
  '.mp4', '.mov', '.webm', '.mkv', '.avi', '.3gp', '.wmv', '.flv', '.m4v', '.ogv'
]);

const MEDIA_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg',
  '.mp4', '.mov', '.webm', '.mkv', '.avi'
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

  toRelative(ownerRoot: string, absolutePath: string): string {
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

  /**
   * Resuelve los datos de un archivo en disco relativo a la raíz del usuario.
   */
  async getEntryForRelativePath(
    ownerRoot: string,
    relativePath: string,
    favSet: Set<string>,
    archSet: Set<string>
  ): Promise<PhotosEntry | null> {
    const cleaned = (relativePath ?? '').replace(/^[/\\]+/, '');
    const absolute = path.resolve(ownerRoot, cleaned);

    if (!absolute.startsWith(ownerRoot)) return null;

    try {
      const stat = await fs.promises.stat(absolute);
      if (!stat.isFile()) return null;

      const norm = relativePath.split(path.sep).join('/');
      return {
        name: path.basename(absolute),
        type: 'file',
        path: norm,
        size: stat.size,
        modifiedAt: stat.mtimeMs,
        isFavorite: favSet.has(norm),
        isArchived: archSet.has(norm),
      };
    } catch {
      return null;
    }
  }

  /**
   * Lista los álbumes unificando los metadatos y las carpetas físicas de Albumes/.
   */
  async listAlbums(owner: string): Promise<AlbumSummary[]> {
    const ownerRoot = this.resolveUserRoot(owner);
    const albumsDir = await this.ensureAlbumsDirectory(owner);
    const metadata = await photosMetadataService.getMetadata(owner);

    const summaries: Map<string, AlbumSummary> = new Map();

    // 1. Cargar álbumes definidos en metadatos
    for (const [id, album] of Object.entries(metadata.albums)) {
      summaries.set(id, {
        id,
        title: album.title,
        path: `Albumes/${album.title}`,
        itemCount: album.items.length,
        coverPath: album.coverPath || (album.items.length > 0 ? album.items[0] : undefined),
        createdAt: album.createdAt,
      });
    }

    // 2. Revisar carpetas físicas en Albumes/ para sincronizar álbumes creados en el FS
    try {
      const dirItems = await fs.promises.readdir(albumsDir, { withFileTypes: true });
      for (const item of dirItems) {
        if (item.name.startsWith('.')) continue;
        if (item.isDirectory()) {
          const albumKey = item.name.toLowerCase().replace(/[^a-z0-9_-]/gi, '_');
          if (!summaries.has(albumKey)) {
            const fullPath = path.join(albumsDir, item.name);
            const stat = await fs.promises.stat(fullPath);
            summaries.set(albumKey, {
              id: albumKey,
              title: item.name,
              path: `Albumes/${item.name}`,
              itemCount: 0,
              createdAt: stat.birthtimeMs || stat.mtimeMs,
            });
          }
        }
      }
    } catch (err) {
      console.warn(`[PhotosService] Error explorando carpeta Albumes de ${owner}:`, err);
    }

    const result = Array.from(summaries.values());
    result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return result;
  }

  /**
   * Crea un nuevo álbum tanto a nivel lógico (metadatos) como carpeta física en Albumes/.
   */
  async createAlbum(owner: string, title: string): Promise<AlbumSummary> {
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

    // Asegurar directorio físico
    if (!fs.existsSync(targetDir)) {
      await fs.promises.mkdir(targetDir, { recursive: true });
    }

    // Guardar en metadatos
    const { id, album } = await photosMetadataService.createAlbum(owner, sanitizedTitle);

    return {
      id,
      title: album.title,
      path: `Albumes/${sanitizedTitle}`,
      itemCount: album.items.length,
      coverPath: album.coverPath,
      createdAt: album.createdAt,
    };
  }

  /**
   * Obtiene el contenido de un álbum específico (por ID o título).
   * Combina las imágenes referenciadas en metadatos + cualquier archivo físico colocado en Albumes/<title>.
   */
  async getAlbumContent(owner: string, albumIdOrTitle: string): Promise<{ title: string; entries: PhotosEntry[] }> {
    const ownerRoot = this.resolveUserRoot(owner);
    const metadata = await photosMetadataService.getMetadata(owner);
    const favSet = new Set(metadata.favorites);
    const archSet = new Set(metadata.archived);

    // Buscar el álbum en metadatos
    let albumKey = albumIdOrTitle;
    let albumData = metadata.albums[albumKey];

    if (!albumData) {
      const lower = albumIdOrTitle.toLowerCase().trim();
      for (const [k, v] of Object.entries(metadata.albums)) {
        if (k.toLowerCase() === lower || v.title.toLowerCase() === lower) {
          albumKey = k;
          albumData = v;
          break;
        }
      }
    }

    const albumTitle = albumData ? albumData.title : albumIdOrTitle;
    const pathsSet = new Set<string>(albumData?.items ?? []);

    // Si existe la carpeta física Albumes/<title>, incluir también los archivos físicos directos
    const physicalAlbumDir = path.join(ownerRoot, 'Albumes', albumTitle);
    if (fs.existsSync(physicalAlbumDir)) {
      try {
        const files = await fs.promises.readdir(physicalAlbumDir, { withFileTypes: true });
        for (const file of files) {
          if (file.name.startsWith('.') || file.name.endsWith('.thumb.jpg')) continue;
          if (file.isFile()) {
            const ext = path.extname(file.name).toLowerCase();
            if (MEDIA_EXTENSIONS.has(ext)) {
              const rel = this.toRelative(ownerRoot, path.join(physicalAlbumDir, file.name));
              pathsSet.add(rel);
            }
          }
        }
      } catch {
        // Ignorar error de lectura de carpeta
      }
    }

    const entries: PhotosEntry[] = [];
    for (const relPath of pathsSet) {
      // Excluir archivados en álbumes si se desea, o mantenerlos marcados
      if (archSet.has(relPath)) continue;

      const entry = await this.getEntryForRelativePath(ownerRoot, relPath, favSet, archSet);
      if (entry) {
        entries.push(entry);
      }
    }

    entries.sort((a, b) => (b.modifiedAt ?? 0) - (a.modifiedAt ?? 0));
    return {
      title: albumTitle,
      entries,
    };
  }

  /**
   * Lista todos los archivos marcados como Favoritos (que aún existan en disco y no estén archivados).
   */
  async listFavorites(owner: string): Promise<PhotosEntry[]> {
    const ownerRoot = this.resolveUserRoot(owner);
    const metadata = await photosMetadataService.getMetadata(owner);
    const favSet = new Set(metadata.favorites);
    const archSet = new Set(metadata.archived);

    const entries: PhotosEntry[] = [];
    for (const relPath of metadata.favorites) {
      if (archSet.has(relPath)) continue;
      const entry = await this.getEntryForRelativePath(ownerRoot, relPath, favSet, archSet);
      if (entry) {
        entries.push(entry);
      }
    }

    entries.sort((a, b) => (b.modifiedAt ?? 0) - (a.modifiedAt ?? 0));
    return entries;
  }

  /**
   * Lista todos los archivos Archivados (que aún existan en disco).
   */
  async listArchived(owner: string): Promise<PhotosEntry[]> {
    const ownerRoot = this.resolveUserRoot(owner);
    const metadata = await photosMetadataService.getMetadata(owner);
    const favSet = new Set(metadata.favorites);
    const archSet = new Set(metadata.archived);

    const entries: PhotosEntry[] = [];
    for (const relPath of metadata.archived) {
      const entry = await this.getEntryForRelativePath(ownerRoot, relPath, favSet, archSet);
      if (entry) {
        entries.push(entry);
      }
    }

    entries.sort((a, b) => (b.modifiedAt ?? 0) - (a.modifiedAt ?? 0));
    return entries;
  }

  /**
   * Lista todos los videos del usuario que NO estén archivados.
   */
  async listVideos(owner: string): Promise<PhotosEntry[]> {
    const ownerRoot = this.resolveUserRoot(owner);
    const metadata = await photosMetadataService.getMetadata(owner);
    const favSet = new Set(metadata.favorites);
    const archSet = new Set(metadata.archived);

    const videos: PhotosEntry[] = [];
    await this.scanVideosRecursively(ownerRoot, ownerRoot, videos, favSet, archSet);
    videos.sort((a, b) => (b.modifiedAt ?? 0) - (a.modifiedAt ?? 0));
    return videos;
  }

  private async scanVideosRecursively(
    currentDir: string,
    ownerRoot: string,
    acc: PhotosEntry[],
    favSet: Set<string>,
    archSet: Set<string>,
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
          await this.scanVideosRecursively(fullPath, ownerRoot, acc, favSet, archSet, maxDepth, depth + 1);
        } else if (item.isFile()) {
          if (item.name.endsWith('.thumb.jpg')) continue;
          const ext = path.extname(item.name).toLowerCase();
          if (VIDEO_EXTENSIONS.has(ext)) {
            const relPath = this.toRelative(ownerRoot, fullPath);
            if (archSet.has(relPath)) continue; // Excluir archivados

            const stat = await fs.promises.stat(fullPath);
            acc.push({
              name: item.name,
              type: 'file',
              path: relPath,
              size: stat.size,
              modifiedAt: stat.mtimeMs,
              isFavorite: favSet.has(relPath),
              isArchived: false,
            });
          }
        }
      }
    } catch {
      // Ignorar directorios no legibles
    }
  }

  /**
   * Lista archivos añadidos recientemente que NO estén archivados.
   */
  async listRecent(owner: string, maxHours = 24): Promise<PhotosEntry[]> {
    const ownerRoot = this.resolveUserRoot(owner);
    const metadata = await photosMetadataService.getMetadata(owner);
    const favSet = new Set(metadata.favorites);
    const archSet = new Set(metadata.archived);

    const recent: PhotosEntry[] = [];
    const thresholdMs = Date.now() - maxHours * 60 * 60 * 1000;

    await this.scanRecentRecursively(ownerRoot, ownerRoot, thresholdMs, recent, favSet, archSet);
    recent.sort((a, b) => (b.modifiedAt ?? 0) - (a.modifiedAt ?? 0));
    return recent;
  }

  private async scanRecentRecursively(
    currentDir: string,
    ownerRoot: string,
    thresholdMs: number,
    acc: PhotosEntry[],
    favSet: Set<string>,
    archSet: Set<string>,
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
          await this.scanRecentRecursively(fullPath, ownerRoot, thresholdMs, acc, favSet, archSet, maxDepth, depth + 1);
        } else if (item.isFile()) {
          if (item.name.endsWith('.thumb.jpg')) continue;
          const ext = path.extname(item.name).toLowerCase();
          if (!MEDIA_EXTENSIONS.has(ext)) continue;

          const relPath = this.toRelative(ownerRoot, fullPath);
          if (archSet.has(relPath)) continue; // Excluir archivados

          const stat = await fs.promises.stat(fullPath);
          if (stat.mtimeMs >= thresholdMs) {
            acc.push({
              name: item.name,
              type: 'file',
              path: relPath,
              size: stat.size,
              modifiedAt: stat.mtimeMs,
              isFavorite: favSet.has(relPath),
              isArchived: false,
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
