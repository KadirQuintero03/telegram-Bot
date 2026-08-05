import fs from 'fs';
import path from 'path';
import { config } from '../config/env.js';
import { CATEGORY_DIRS } from '../types/media.types.js';

interface UserRecord {
    telegramId: number;
    username: string;
    folderName: string;
    registeredAt: string;
    phone?: string;
    phoneRegisteredAt?: string;
}

interface Registry {
    users: Record<number, UserRecord>;
}

const REGISTRY_FILE = path.join(config.registryStoragePath, 'registry.json');

export class UserRegistryService {
    private registry: Registry = { users: {} };

    constructor() {
        this.ensureBaseDir();
        this.loadRegistry();
    }


    isRegistered(telegramId: number): boolean {
        return telegramId in this.registry.users;
    }


    getFolderByTelegramId(telegramId: number): string | null {
        const record = this.registry.users[telegramId];
        if (!record) return null;
        return path.join(config.filesStoragePath, record.folderName);
    }


    registerUser(telegramId: number, username: string): string {





        if (this.isRegistered(telegramId)) {
            const existing = this.registry.users[telegramId]!;
            if (existing.username !== username) {
                existing.username = username;
                this.saveRegistry();
                console.info(`[UserRegistry] Usuario actualizado: ${existing.folderName}`);
            }
            return path.join(config.filesStoragePath, existing.folderName);
        }


        const folderName = this.sanitize(username);
        const folderPath = path.join(config.filesStoragePath, folderName);


        for (const dir of Object.values(CATEGORY_DIRS)) {
            fs.mkdirSync(path.join(folderPath, dir), { recursive: true });
        }


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




    hasPhone(telegramId: number): boolean {
        const record = this.registry.users[telegramId];
        return !!record?.phone;
    }

    getPhone(telegramId: number): string | null {
        return this.registry.users[telegramId]?.phone ?? null;
    }




    savePhone(telegramId: number, rawPhone: string): UserRecord | null {
        const record = this.registry.users[telegramId];
        if (!record) return null;

        const normalized = this.normalizePhone(rawPhone);



        if (record.phone && this.normalizePhone(record.phone) === normalized) {
            return record;
        }

        record.phone = normalized;
        record.phoneRegisteredAt = new Date().toISOString();
        this.saveRegistry();
        console.info(`[UserRegistry] Teléfono guardado para: ${record.folderName}`);
        return record;
    }



    findByPhone(rawPhone: string): UserRecord | null {
        const target = this.normalizePhone(rawPhone);
        if (!target) return null;

        for (const record of Object.values(this.registry.users)) {
            if (record.phone && this.normalizePhone(record.phone) === target) {
                return record;
            }
        }
        return null;
    }



    normalizePhone(phone: string): string {
        return (phone ?? '').replace(/\D/g, '');
    }

    private ensureBaseDir(): void {
        fs.mkdirSync(config.filesStoragePath, { recursive: true });
        fs.mkdirSync(config.registryStoragePath, { recursive: true });
    }

    private loadRegistry(): void {
        try {
            if (fs.existsSync(REGISTRY_FILE)) {
                const raw = fs.readFileSync(REGISTRY_FILE, 'utf-8');
                this.registry = JSON.parse(raw) as Registry;
                console.info(`[UserRegistry] ${Object.keys(this.registry.users).length} usuarios cargados.`);
            } else {
                this.migrateFromLegacyLocation();
            }
        } catch (err) {
            console.warn('[UserRegistry] Registro vacío, iniciando desde cero.', err);
            this.registry = { users: {} };
        }
    }





    private migrateFromLegacyLocation(): void {
        const legacyFile = path.join(config.filesStoragePath, 'registry.json');
        try {
            if (fs.existsSync(legacyFile)) {
                const raw = fs.readFileSync(legacyFile, 'utf-8');
                this.registry = JSON.parse(raw) as Registry;
                this.saveRegistry();
                fs.rmSync(legacyFile, { force: true });
                console.info(
                    `[UserRegistry] registry.json migrado de la carpeta pública (${legacyFile}) a ${REGISTRY_FILE}.`
                );
            }
        } catch (err) {
            console.warn('[UserRegistry] No se pudo migrar registry.json antiguo.', err);
        }
    }

    private saveRegistry(): void {
        try {
            fs.writeFileSync(REGISTRY_FILE, JSON.stringify(this.registry, null, 2), 'utf-8');
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Error desconocido';
            console.error(`[UserRegistry] No se pudo guardar registry.json: ${msg}`);
            throw new Error(`No se pudo guardar el registro de usuarios: ${msg}`);
        }
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
