import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { MediaCategory, CATEGORY_DIRS } from '../types/media.types.js';

export class FileStorageService {

    // Descarga un archivo desde una URL y lo guarda en la carpeta del usuario
    async downloadAndSave(
        fileUrl: string,
        fileName: string,
        category: MediaCategory,
        userFolder: string
    ): Promise<string> {
        const categoryDir = path.join(userFolder, CATEGORY_DIRS[category]); // 👈 cambiado
        const safeFileName = this.sanitizeFileName(fileName);
        const finalPath = this.resolveUniqueFilePath(categoryDir, safeFileName);

        await this.downloadFile(fileUrl, finalPath);

        console.info(`[FileStorage] Archivo guardado: ${finalPath}`);
        return finalPath;
    }

    // Guarda un Buffer ya descargado en memoria (ej: video de TikTok) en la carpeta del usuario
    async saveBuffer(
        buffer: Buffer,
        fileName: string,
        category: MediaCategory,
        userFolder: string
    ): Promise<string> {
        const categoryDir = path.join(userFolder, CATEGORY_DIRS[category]);
        const safeFileName = this.sanitizeFileName(fileName);
        const finalPath = this.resolveUniqueFilePath(categoryDir, safeFileName);

        fs.mkdirSync(categoryDir, { recursive: true });
        fs.writeFileSync(finalPath, buffer);

        console.info(`[FileStorage] Archivo guardado: ${finalPath}`);
        return finalPath;
    }

    // Evita sobreescribir archivos con el mismo nombre
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

    // Limpia caracteres inválidos del nombre del archivo
    private sanitizeFileName(name: string): string {
        return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim() || 'archivo';
    }

    // Descarga el archivo desde una URL usando http/https nativo
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