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
    /** Lista los archivos de una categoría, ordenados por fecha de guardado (ascendente). */
    listFiles(userFolder: string, category: MediaCategory): CloudFileInfo[] {
        const dir = path.join(userFolder, CATEGORY_DIRS[category]);
        if (!fs.existsSync(dir)) return [];

        const files = fs
            .readdirSync(dir)
            .filter((f) => fs.statSync(path.join(dir, f)).isFile())
            .map((f) => {
                const fullPath = path.join(dir, f);
                const stat = fs.statSync(fullPath);
                return { name: f, fullPath, sizeBytes: stat.size, mtimeMs: stat.mtimeMs };
            });

        return files.sort((a, b) => a.mtimeMs - b.mtimeMs);
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