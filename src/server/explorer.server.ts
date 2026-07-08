import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { config } from '../config/env.js';

// Raíz absoluta donde el bot guarda todo (ya definida en config/env.ts)
const BASE_STORAGE_PATH = path.resolve(config.filesStoragePath);

interface ExplorerEntry {
    name: string;
    type: 'directory' | 'file';
    path: string; // relativo a BASE_STORAGE_PATH, con separadores '/'
    size?: number;
    modifiedAt?: number;
}

// Convierte un path relativo (enviado por el frontend) en un path absoluto real,
// y evita que se salga de BASE_STORAGE_PATH (path traversal).
function resolveSafePath(relativePath: string): string {
    const cleaned = (relativePath ?? '').replace(/^[/\\]+/, '');
    const candidate = path.resolve(BASE_STORAGE_PATH, cleaned);

    if (!candidate.startsWith(BASE_STORAGE_PATH)) {
        throw new Error('Ruta inválida');
    }
    return candidate;
}

function toRelative(absolutePath: string): string {
    return path.relative(BASE_STORAGE_PATH, absolutePath).split(path.sep).join('/');
}

export function createExplorerServer() {
    const app = express();

    app.use(cors({ origin: '*' }));

    // ── Listar contenido de un directorio ─────────────────────────
    app.get('/explorer', (req: Request, res: Response) => {
        const relativePath = (req.query.path as string) ?? '';

        try {
            const target = resolveSafePath(relativePath);

            if (!fs.existsSync(target)) {
                return res.status(404).json({ error: 'Directorio no encontrado' });
            }
            if (!fs.statSync(target).isDirectory()) {
                return res.status(400).json({ error: 'La ruta no es un directorio' });
            }

            const dirEntries = fs.readdirSync(target, { withFileTypes: true });

            const entries: ExplorerEntry[] = dirEntries.map((dirent) => {
                const entryAbsolutePath = path.join(target, dirent.name);
                const entryRelativePath = toRelative(entryAbsolutePath);

                if (dirent.isDirectory()) {
                    return {
                        name: dirent.name,
                        type: 'directory',
                        path: entryRelativePath,
                    };
                }

                const stat = fs.statSync(entryAbsolutePath);
                return {
                    name: dirent.name,
                    type: 'file',
                    path: entryRelativePath,
                    size: stat.size,
                    modifiedAt: stat.mtimeMs,
                };
            });

            // Carpetas primero, luego archivos, orden alfabético
            entries.sort((a, b) => {
                if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
                return a.name.localeCompare(b.name);
            });

            res.json({
                currentPath: relativePath,
                entries,
            });
        } catch (error) {
            console.error('[ExplorerServer] Error al listar directorio:', error);
            res.status(400).json({ error: 'Ruta inválida' });
        }
    });

    // ── Servir el contenido real de un archivo ────────────────────
    app.get('/explorer/file', (req: Request, res: Response) => {
        const relativePath = (req.query.path as string) ?? '';

        try {
            const target = resolveSafePath(relativePath);

            if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
                return res.status(404).json({ error: 'Archivo no encontrado' });
            }

            res.sendFile(target);
        } catch (error) {
            console.error('[ExplorerServer] Error al servir archivo:', error);
            res.status(400).json({ error: 'Ruta inválida' });
        }
    });

    return app;
}