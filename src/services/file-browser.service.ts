import fs from 'fs';
import path from 'path';
import { MediaCategory, CATEGORY_DIRS } from '../types/media.types.js';

export interface CloudFileInfo {
  name: string;
  fullPath: string;
  sizeBytes: number;
  mtimeMs: number;
}

export const FILE_PAGE_SIZE = 10;

export class FileBrowserService {
  async listFiles(userFolder: string, category: MediaCategory): Promise<CloudFileInfo[]> {
    const dir = path.join(userFolder, CATEGORY_DIRS[category]);
    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      const fileEntries = entries.filter((e) => e.isFile());

      const files = await Promise.all(
        fileEntries.map(async (entry) => {
          const fullPath = path.join(dir, entry.name);
          const stat = await fs.promises.stat(fullPath);
          return {
            name: entry.name,
            fullPath,
            sizeBytes: stat.size,
            mtimeMs: stat.mtimeMs,
          };
        })
      );

      return files.sort((a, b) => a.mtimeMs - b.mtimeMs);
    } catch {
      return [];
    }
  }

  getPage(files: CloudFileInfo[], offset: number): { page: CloudFileInfo[]; hasNext: boolean } {
    const page = files.slice(offset, offset + FILE_PAGE_SIZE);
    const hasNext = offset + FILE_PAGE_SIZE < files.length;
    return { page, hasNext };
  }

  getTotalSizeFormatted(files: CloudFileInfo[]): string {
    const totalBytes = files.reduce((sum, f) => sum + f.sizeBytes, 0);
    return this.formatBytes(totalBytes);
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(2)} KB`;
    const mb = kb / 1024;
    if (mb < 1024) return `${mb.toFixed(2)} MB`;
    const gb = mb / 1024;
    return `${gb.toFixed(2)} GB`;
  }
}

export const fileBrowserService = new FileBrowserService();
