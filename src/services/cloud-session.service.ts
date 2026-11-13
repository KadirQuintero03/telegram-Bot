import { CloudSessionData } from '../types/cloud.types.js';

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutos de inactividad
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000; // Limpieza periódica cada 15 min

export class CloudSessionService {
  private sessions = new Map<number, CloudSessionData>();
  private cloudUsers = new Set<number>();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupInterval();
  }

  private startCleanupInterval(): void {
    this.cleanupTimer = setInterval(() => {
      this.purgeExpiredSessions();
    }, CLEANUP_INTERVAL_MS);

    // Evita retener el proceso abierto solo por este timer
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  private purgeExpiredSessions(): void {
    const now = Date.now();
    for (const [userId, session] of this.sessions.entries()) {
      if (session.updatedAt && now - session.updatedAt > SESSION_TTL_MS) {
        this.sessions.delete(userId);
      }
    }
  }

  markCloudUsed(userId: number): void {
    this.cloudUsers.add(userId);
  }

  hasUsedCloud(userId: number): boolean {
    return this.cloudUsers.has(userId);
  }

  getSession(userId: number): CloudSessionData {
    let session = this.sessions.get(userId);
    const now = Date.now();

    if (session && session.updatedAt && now - session.updatedAt > SESSION_TTL_MS) {
      this.sessions.delete(userId);
      session = undefined;
    }

    if (!session) {
      session = { offset: 0, pageFiles: [], step: null, updatedAt: now };
      this.sessions.set(userId, session);
    } else {
      session.updatedAt = now;
    }
    return session;
  }

  updateSession(userId: number, data: Partial<CloudSessionData>): CloudSessionData {
    const current = this.getSession(userId);
    const updated: CloudSessionData = { ...current, ...data, updatedAt: Date.now() };
    this.sessions.set(userId, updated);
    return updated;
  }

  resetSession(userId: number): void {
    this.sessions.delete(userId);
  }
}

export const cloudSessionService = new CloudSessionService();
