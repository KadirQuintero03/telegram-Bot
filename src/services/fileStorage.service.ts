import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { config } from '../config/env.js';
import { MediaCategory, CATEGORY_DIRS } from '../types/media.types.js';

export class FileStorageService {
    private basePath: string;

    constructor() {
        this.basePath = config.filesStoragePath;
        this.ensureDirectories();
    }

    // Crea la estructura de carpetas si no existe
    private ensureDirectories(): void {
        // Carpeta raíz filesBotTelegram (o la que defina el usuario)
        if (!fs.existsSync(this.basePath)) {
            fs.mkdirSync(this.basePath, { recursive: true });
            console.info(`[FileStorage] Directorio raíz creado: ${this.basePath}`);
        }

        // Subcarpetas por categoría
        for (const dir of Object.values(CATEGORY_DIRS)) {
            const fullPath = path.join(this.basePath, dir);
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
                console.info(`[FileStorage] Subdirectorio creado: ${fullPath}`);
            }
        }
    }

    // Descarga un archivo desde una URL y lo guarda en la carpeta correcta
    async downloadAndSave(
        fileUrl: string,
        fileName: string,
        category: MediaCategory
    ): Promise<string> {
        const categoryDir = path.join(this.basePath, CATEGORY_DIRS[category]);
        const safeFileName = this.sanitizeFileName(fileName);
        const finalPath = this.resolveUniqueFilePath(categoryDir, safeFileName);

        await this.downloadFile(fileUrl, finalPath);

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
                    // Seguir redirecciones
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