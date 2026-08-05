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
        const finalPath = this.resolveUniqueFilePath(categoryDir, safeFileName);

        fs.mkdirSync(categoryDir, { recursive: true });
        await this.downloadFile(fileUrl, finalPath);

        if (checkDuplicates) {
            const buffer = fs.readFileSync(finalPath);
            const duplicate = this.findDuplicateByHash(categoryDir, buffer, finalPath);
            if (duplicate) {
                fs.unlinkSync(finalPath);
                console.info(`[FileStorage] Duplicado detectado, no se guarda: ${safeFileName}`);
                return duplicate;
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
        fs.mkdirSync(categoryDir, { recursive: true });

        if (checkDuplicates) {
            const duplicate = this.findDuplicateByHash(categoryDir, buffer);
            if (duplicate) {
                console.info(`[FileStorage] Duplicado detectado, no se guarda: ${fileName}`);
                return duplicate;
            }
        }

        const safeFileName = this.sanitizeFileName(fileName);
        const finalPath = this.resolveUniqueFilePath(categoryDir, safeFileName);
        fs.writeFileSync(finalPath, buffer);

        console.info(`[FileStorage] Archivo guardado: ${finalPath}`);
        return finalPath;
    }

    
    private resolveUniqueFilePath(dir: string, fileName: string): string {
        const ext = path.extname(fileName);
        const base = path.basename(fileName, ext);
        let candidate = path.join(dir, fileName);
        let counter = 1;

        while (fs.existsSync(candidate)) {
            candidate = path.join(dir, `${base}_${counter}${ext}`);
            counter++;
        }

        return candidate;
    }

    
    private sanitizeFileName(name: string): string {
        return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim() || 'archivo';
    }

    
    private hashBuffer(buffer: Buffer): string {
        return crypto.createHash('sha256').update(buffer).digest('hex');
    }

    
    private findDuplicateByHash(dir: string, buffer: Buffer, excludePath?: string): string | null {
        if (!fs.existsSync(dir)) return null;
        const targetHash = this.hashBuffer(buffer);
        const entries = fs.readdirSync(dir);

        for (const entry of entries) {
            const entryPath = path.join(dir, entry);
            if (entryPath === excludePath) continue;

            try {
                const existingBuffer = fs.readFileSync(entryPath);
                if (this.hashBuffer(existingBuffer) === targetHash) return entryPath;
            } catch {
                continue;
            }
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
                        fs.unlink(destPath, () => { });
                        reject(new Error(`Error HTTP al descargar: ${response.statusCode}`));
                        return;
                    }

                    response.pipe(file);
                    file.on('finish', () => file.close(() => resolve()));
                    file.on('error', (err) => {
                        fs.unlink(destPath, () => { });
                        reject(err);
                    });
                })
                .on('error', (err) => {
                    fs.unlink(destPath, () => { });
                    reject(err);
                });
        });
    }
}