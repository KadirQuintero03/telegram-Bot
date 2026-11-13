import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import crypto from 'crypto';
import { MediaCategory, CATEGORY_DIRS } from '../types/media.types.js';

export class FileStorageService {
  async downloadAndSave(
    fileUrl: string,
    fileName: string,
    category: MediaCategory,
    userFolder: string,
    checkDuplicates = false
  ): Promise<string> {
    const categoryDir = path.join(userFolder, CATEGORY_DIRS[category]);
    const safeFileName = this.sanitizeFileName(fileName);
    const finalPath = await this.resolveUniqueFilePath(categoryDir, safeFileName);

    await fs.promises.mkdir(categoryDir, { recursive: true });
    await this.downloadFile(fileUrl, finalPath);

    if (checkDuplicates) {
      try {
        const fileHash = await this.hashFile(finalPath);
        const duplicate = await this.findDuplicateByHash(categoryDir, fileHash, finalPath);
        if (duplicate) {
          await fs.promises.unlink(finalPath).catch(() => {});
          console.info(`[FileStorage] Duplicado detectado, no se guarda: ${safeFileName}`);
          return duplicate;
        }
      } catch (err) {
        console.warn(`[FileStorage] Advertencia al verificar duplicados:`, err);
      }
    }

    console.info(`[FileStorage] Archivo guardado: ${finalPath}`);
    return finalPath;
  }

  async saveBuffer(
    buffer: Buffer,
    fileName: string,
    category: MediaCategory,
    userFolder: string,
    checkDuplicates = false
  ): Promise<string> {
    const categoryDir = path.join(userFolder, CATEGORY_DIRS[category]);
    await fs.promises.mkdir(categoryDir, { recursive: true });

    if (checkDuplicates) {
      const bufferHash = this.hashBuffer(buffer);
      const duplicate = await this.findDuplicateByHash(categoryDir, bufferHash);
      if (duplicate) {
        console.info(`[FileStorage] Duplicado detectado, no se guarda: ${fileName}`);
        return duplicate;
      }
    }

    const safeFileName = this.sanitizeFileName(fileName);
    const finalPath = await this.resolveUniqueFilePath(categoryDir, safeFileName);
    await fs.promises.writeFile(finalPath, buffer);

    console.info(`[FileStorage] Archivo guardado: ${finalPath}`);
    return finalPath;
  }

  async downloadDirect(url: string, destPath: string): Promise<void> {
    const parentDir = path.dirname(destPath);
    await fs.promises.mkdir(parentDir, { recursive: true });
    await this.downloadFile(url, destPath);
  }

  private async resolveUniqueFilePath(dir: string, fileName: string): Promise<string> {
    const ext = path.extname(fileName);
    const base = path.basename(fileName, ext);
    let candidate = path.join(dir, fileName);
    let counter = 1;

    while (await this.fileExists(candidate)) {
      candidate = path.join(dir, `${base}_${counter}${ext}`);
      counter++;
    }

    return candidate;
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private sanitizeFileName(name: string): string {
    return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim() || 'archivo';
  }

  private hashBuffer(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  private hashFile(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  private async findDuplicateByHash(
    dir: string,
    targetHash: string,
    excludePath?: string
  ): Promise<string | null> {
    try {
      const entries = await fs.promises.readdir(dir);

      for (const entry of entries) {
        const entryPath = path.join(dir, entry);
        if (entryPath === excludePath) continue;

        try {
          const stat = await fs.promises.stat(entryPath);
          if (!stat.isFile()) continue;

          const existingHash = await this.hashFile(entryPath);
          if (existingHash === targetHash) return entryPath;
        } catch {
          continue;
        }
      }
    } catch {
      return null;
    }

    return null;
  }

  private downloadFile(url: string, destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(destPath);
      const protocol = url.startsWith('https') ? https : http;

      protocol
        .get(url, (response) => {
          if (response.statusCode === 301 || response.statusCode === 302) {
            const redirectUrl = response.headers.location;
            if (redirectUrl) {
              file.close();
              this.downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
              return;
            }
          }

          if (response.statusCode !== 200) {
            file.close();
            fs.promises.unlink(destPath).catch(() => {});
            reject(new Error(`Error HTTP al descargar: ${response.statusCode}`));
            return;
          }

          response.pipe(file);
          file.on('finish', () => file.close(() => resolve()));
          file.on('error', (err) => {
            fs.promises.unlink(destPath).catch(() => {});
            reject(err);
          });
        })
        .on('error', (err) => {
          fs.promises.unlink(destPath).catch(() => {});
          reject(err);
        });
    });
  }
}
