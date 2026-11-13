import fs from 'fs';
import path from 'path';
import { config } from '../config/env.js';

export interface AlbumData {
  title: string;
  createdAt: number;
  coverPath?: string;
  items: string[]; // rutas relativas (ej. "vacaciones/foto1.jpg")
}

export interface UserGalleryMetadata {
  favorites: string[];
  archived: string[];
  albums: Record<string, AlbumData>;
}

export class PhotosMetadataService {
  private baseStoragePath: string;
  private queueMap: Map<string, Promise<any>> = new Map();

  constructor() {
    this.baseStoragePath = path.resolve(config.filesStoragePath);
  }

  private resolveMetadataPath(owner: string): string {
    if (!owner || /[/\\]/.test(owner) || owner.includes('..')) {
      throw new Error('Identificador de usuario (owner) inválido.');
    }
    const ownerRoot = path.resolve(this.baseStoragePath, owner);
    return path.join(ownerRoot, '.gallery-metadata.json');
  }

  private normalizePath(rawPath: string): string {
    return (rawPath ?? '')
      .replace(/^[/\\]+/, '')
      .split(path.sep)
      .join('/');
  }

  /**
   * Ejecuta operaciones serializadas por usuario para evitar condiciones de carrera en el JSON.
   */
  private async runSynchronized<T>(owner: string, task: () => Promise<T>): Promise<T> {
    const prevPromise = this.queueMap.get(owner) ?? Promise.resolve();
    let resolveCurrent!: (val: any) => void;
    let rejectCurrent!: (err: any) => void;

    const currentPromise = new Promise((resolve, reject) => {
      resolveCurrent = resolve;
      rejectCurrent = reject;
    });

    this.queueMap.set(owner, currentPromise);

    try {
      await prevPromise.catch(() => {});
      const result = await task();
      resolveCurrent(result);
      return result;
    } catch (err) {
      rejectCurrent(err);
      throw err;
    } finally {
      if (this.queueMap.get(owner) === currentPromise) {
        this.queueMap.delete(owner);
      }
    }
  }

  private async loadMetadata(owner: string): Promise<UserGalleryMetadata> {
    const metaPath = this.resolveMetadataPath(owner);
    if (!fs.existsSync(metaPath)) {
      return {
        favorites: [],
        archived: [],
        albums: {},
      };
    }

    try {
      const raw = await fs.promises.readFile(metaPath, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
        archived: Array.isArray(parsed.archived) ? parsed.archived : [],
        albums: parsed.albums && typeof parsed.albums === 'object' ? parsed.albums : {},
      };
    } catch (err) {
      console.warn(`[PhotosMetadata] Error leyendo metadatos de ${owner}, usando valores por defecto:`, err);
      return {
        favorites: [],
        archived: [],
        albums: {},
      };
    }
  }

  private async saveMetadata(owner: string, data: UserGalleryMetadata): Promise<void> {
    const metaPath = this.resolveMetadataPath(owner);
    const parentDir = path.dirname(metaPath);
    if (!fs.existsSync(parentDir)) {
      await fs.promises.mkdir(parentDir, { recursive: true });
    }
    await fs.promises.writeFile(metaPath, JSON.stringify(data, null, 2), 'utf-8');
  }

  async getMetadata(owner: string): Promise<UserGalleryMetadata> {
    return this.runSynchronized(owner, async () => {
      return this.loadMetadata(owner);
    });
  }

  // --- FAVORITOS ---

  async setFavorite(owner: string, relativePath: string, isFavorite?: boolean): Promise<{ isFavorite: boolean }> {
    return this.runSynchronized(owner, async () => {
      const norm = this.normalizePath(relativePath);
      const data = await this.loadMetadata(owner);
      const favSet = new Set(data.favorites);

      const nextState = isFavorite !== undefined ? isFavorite : !favSet.has(norm);

      if (nextState) {
        favSet.add(norm);
      } else {
        favSet.delete(norm);
      }

      data.favorites = Array.from(favSet);
      await this.saveMetadata(owner, data);
      return { isFavorite: nextState };
    });
  }

  // --- ARCHIVO ---

  async setArchived(owner: string, relativePath: string, isArchived?: boolean): Promise<{ isArchived: boolean }> {
    return this.runSynchronized(owner, async () => {
      const norm = this.normalizePath(relativePath);
      const data = await this.loadMetadata(owner);
      const archSet = new Set(data.archived);

      const nextState = isArchived !== undefined ? isArchived : !archSet.has(norm);

      if (nextState) {
        archSet.add(norm);
      } else {
        archSet.delete(norm);
      }

      data.archived = Array.from(archSet);
      await this.saveMetadata(owner, data);
      return { isArchived: nextState };
    });
  }

  // --- ÁLBUMES ---

  async getAlbums(owner: string): Promise<Record<string, AlbumData>> {
    const data = await this.getMetadata(owner);
    return data.albums;
  }

  async createAlbum(owner: string, title: string): Promise<{ id: string; album: AlbumData }> {
    return this.runSynchronized(owner, async () => {
      const trimmedTitle = (title ?? '').trim();
      if (!trimmedTitle) {
        throw new Error('Debes indicar un título para el álbum.');
      }

      const id = trimmedTitle.toLowerCase().replace(/[^a-z0-9_-]/gi, '_');
      const data = await this.loadMetadata(owner);

      if (data.albums[id] || Object.values(data.albums).some(a => a.title.toLowerCase() === trimmedTitle.toLowerCase())) {
        throw new Error(`Ya existe un álbum con el nombre "${trimmedTitle}".`);
      }

      const newAlbum: AlbumData = {
        title: trimmedTitle,
        createdAt: Date.now(),
        items: [],
      };

      data.albums[id] = newAlbum;
      await this.saveMetadata(owner, data);

      return { id, album: newAlbum };
    });
  }

  async addItemsToAlbum(owner: string, albumIdOrTitle: string, relativePaths: string[]): Promise<AlbumData> {
    return this.runSynchronized(owner, async () => {
      const data = await this.loadMetadata(owner);
      const key = this.findAlbumKey(data.albums, albumIdOrTitle);
      if (!key) {
        throw new Error(`El álbum "${albumIdOrTitle}" no existe.`);
      }

      const album = data.albums[key];
      const itemsSet = new Set(album.items);

      for (const p of relativePaths) {
        const norm = this.normalizePath(p);
        if (norm) {
          itemsSet.add(norm);
        }
      }

      album.items = Array.from(itemsSet);
      if (!album.coverPath && album.items.length > 0) {
        album.coverPath = album.items[0];
      }

      await this.saveMetadata(owner, data);
      return album;
    });
  }

  async removeItemFromAlbum(owner: string, albumIdOrTitle: string, relativePath: string): Promise<AlbumData> {
    return this.runSynchronized(owner, async () => {
      const data = await this.loadMetadata(owner);
      const key = this.findAlbumKey(data.albums, albumIdOrTitle);
      if (!key) {
        throw new Error(`El álbum "${albumIdOrTitle}" no existe.`);
      }

      const album = data.albums[key];
      const norm = this.normalizePath(relativePath);
      album.items = album.items.filter((item) => item !== norm);

      if (album.coverPath === norm) {
        album.coverPath = album.items[0] || undefined;
      }

      await this.saveMetadata(owner, data);
      return album;
    });
  }

  async deleteAlbum(owner: string, albumIdOrTitle: string): Promise<{ success: boolean }> {
    return this.runSynchronized(owner, async () => {
      const data = await this.loadMetadata(owner);
      const key = this.findAlbumKey(data.albums, albumIdOrTitle);
      if (!key) {
        throw new Error(`El álbum "${albumIdOrTitle}" no existe.`);
      }

      delete data.albums[key];
      await this.saveMetadata(owner, data);
      return { success: true };
    });
  }

  /**
   * Cuando se borra un archivo físicamente, limpia sus referencias en favoritos, archivados y álbumes.
   */
  async cleanReferencesOfDeletedFile(owner: string, relativePath: string): Promise<void> {
    return this.runSynchronized(owner, async () => {
      const data = await this.loadMetadata(owner);
      const norm = this.normalizePath(relativePath);

      let changed = false;

      if (data.favorites.includes(norm)) {
        data.favorites = data.favorites.filter((f) => f !== norm);
        changed = true;
      }

      if (data.archived.includes(norm)) {
        data.archived = data.archived.filter((a) => a !== norm);
        changed = true;
      }

      for (const album of Object.values(data.albums)) {
        if (album.items.includes(norm)) {
          album.items = album.items.filter((item) => item !== norm);
          if (album.coverPath === norm) {
            album.coverPath = album.items[0] || undefined;
          }
          changed = true;
        }
      }

      if (changed) {
        await this.saveMetadata(owner, data);
      }
    });
  }

  private findAlbumKey(albums: Record<string, AlbumData>, idOrTitle: string): string | null {
    if (albums[idOrTitle]) return idOrTitle;
    const lower = idOrTitle.toLowerCase().trim();
    for (const [key, album] of Object.entries(albums)) {
      if (key.toLowerCase() === lower || album.title.toLowerCase() === lower) {
        return key;
      }
    }
    return null;
  }
}

export const photosMetadataService = new PhotosMetadataService();
