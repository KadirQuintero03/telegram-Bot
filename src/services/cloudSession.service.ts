import { CloudSessionData } from '../types/cloud.types.js';

export class CloudSessionService {
    private sessions = new Map<number, CloudSessionData>();
    private cloudUsers = new Set<number>();

    /**
     * Marca que el usuario ha usado /cloud. La verificación de duplicados
     * al subir archivos solo se activa para usuarios que han usado este comando.
     */
    markCloudUsed(userId: number): void {
        this.cloudUsers.add(userId);
    }

    hasUsedCloud(userId: number): boolean {
        return this.cloudUsers.has(userId);
    }

    getSession(userId: number): CloudSessionData {
        let session = this.sessions.get(userId);
        if (!session) {
            session = { offset: 0, pageFiles: [], step: null };
            this.sessions.set(userId, session);
        }
        return session;
    }

    updateSession(userId: number, data: Partial<CloudSessionData>): CloudSessionData {
        const current = this.getSession(userId);
        const updated = { ...current, ...data };
        this.sessions.set(userId, updated);
        return updated;
    }

    resetSession(userId: number): void {
        this.sessions.delete(userId);
    }
}

export const cloudSessionService = new CloudSessionService();