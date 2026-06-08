import fs from 'fs';
import path from 'path';
import { config } from '../config/env.js';
import { CATEGORY_DIRS } from '../types/media.types.js';

interface UserRecord {
    telegramId: number;
    username: string;
    folderName: string;
    registeredAt: string;
}

interface Registry {
    users: Record<number, UserRecord>; // clave: telegramId
}

const REGISTRY_FILE = path.join(config.filesStoragePath, 'registry.json');

export class UserRegistryService {
    private registry: Registry = { users: {} };

    constructor() {
        this.ensureBaseDir();
        this.loadRegistry();
    }

    // ── Verifica si el usuario ya está registrado ───────────────────
    isRegistered(telegramId: number): boolean {
        return telegramId in this.registry.users;
    }

    // ── Obtiene la carpeta del usuario por su Telegram ID ───────────
    getFolderByTelegramId(telegramId: number): string | null {
        const record = this.registry.users[telegramId];
        if (!record) return null;
        return path.join(config.filesStoragePath, record.folderName);
    }

    // ── Registra al usuario y crea su carpeta con subcarpetas ───────
    registerUser(telegramId: number, username: string): string {
        // Si ya existe, actualizamos el username pero mantenemos la misma carpeta
        if (this.isRegistered(telegramId)) {
            const existing = this.registry.users[telegramId]!;
            existing.username = username;
            this.saveRegistry();
            console.info(`[UserRegistry] Usuario actualizado: ${existing.folderName}`);
            return path.join(config.filesStoragePath, existing.folderName);
        }

        // Nombre de carpeta: solo el username sanitizado
        const folderName = this.sanitize(username);
        const folderPath = path.join(config.filesStoragePath, folderName);

        // Crear carpeta del usuario y sus 4 subcarpetas
        for (const dir of Object.values(CATEGORY_DIRS)) {
            fs.mkdirSync(path.join(folderPath, dir), { recursive: true });
        }

        // Guardar en registro
        this.registry.users[telegramId] = {
            telegramId,
            username,
            folderName,
            registeredAt: new Date().toISOString(),
        };

        this.saveRegistry();
        console.info(`[UserRegistry] Usuario registrado: ${folderName}`);
        return folderPath;
    }

    // ── Privados ─────────────────────────────────────────────────────
    private ensureBaseDir(): void {
        fs.mkdirSync(config.filesStoragePath, { recursive: true });
    }

    private loadRegistry(): void {
        try {
            if (fs.existsSync(REGISTRY_FILE)) {
                const raw = fs.readFileSync(REGISTRY_FILE, 'utf-8');
                this.registry = JSON.parse(raw) as Registry;
                console.info(`[UserRegistry] ${Object.keys(this.registry.users).length} usuarios cargados.`);
            }
        } catch (err) {
            console.warn('[UserRegistry] Registro vacío, iniciando desde cero.', err);
            this.registry = { users: {} };
        }
    }

    private saveRegistry(): void {
        fs.writeFileSync(REGISTRY_FILE, JSON.stringify(this.registry, null, 2), 'utf-8');
    }

    private sanitize(text: string): string {
        return text
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_\-]/gi, '')
            .substring(0, 40) || `usuario_${Date.now()}`;
    }
}

export const userRegistry = new UserRegistryService();