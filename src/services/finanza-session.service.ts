import { FinanzaSessionData, FinanzaSessionStep } from '../types/finanzas.types.js';

const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutos de expiración

export class FinanzaSessionService {
  private sessions = new Map<number, FinanzaSessionData>();

  setStep(userId: number, step: FinanzaSessionStep): void {
    this.sessions.set(userId, {
      step,
      startedAt: Date.now(),
    });
  }

  getStep(userId: number): FinanzaSessionStep | null {
    const session = this.sessions.get(userId);
    if (!session) return null;

    if (Date.now() - session.startedAt > SESSION_TTL_MS) {
      this.sessions.delete(userId);
      return null;
    }

    return session.step;
  }

  clearSession(userId: number): void {
    this.sessions.delete(userId);
  }
}

export const finanzaSessionService = new FinanzaSessionService();
