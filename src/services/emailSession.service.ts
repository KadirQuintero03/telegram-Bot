import { EmailSessionData } from '../types/email.types.js';

export class EmailSessionService {
    private sessions = new Map<number, EmailSessionData>();

    startSession(userId: number): EmailSessionData {
        const session: EmailSessionData = { step: 'awaiting_destino' };
        this.sessions.set(userId, session);
        return session;
    }

    getSession(userId: number): EmailSessionData | null {
        return this.sessions.get(userId) ?? null;
    }

    hasActiveSession(userId: number): boolean {
        return this.sessions.has(userId);
    }

    updateSession(userId: number, data: Partial<EmailSessionData>): EmailSessionData | null {
        const current = this.sessions.get(userId);
        if (!current) return null;
        const updated = { ...current, ...data };
        this.sessions.set(userId, updated);
        return updated;
    }

    endSession(userId: number): void {
        this.sessions.delete(userId);
    }
}

export const emailSessionService = new EmailSessionService();