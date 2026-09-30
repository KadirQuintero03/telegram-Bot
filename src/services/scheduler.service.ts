import cron from 'node-cron';
import { Telegraf } from 'telegraf';
import { BotContext } from '../types/bot.types.js';
import { dataStore, Reminder } from './data-store.service.js';
import { buildWeeklyReport, buildMonthlyReport, buildAnnualReport } from '../utils/finanzas.js';

const REMINDER_POLL_MS = 30_000;

class SchedulerService {
  private bot: Telegraf<BotContext> | null = null;
  private remindersRunning = false;

  setBot(bot: Telegraf<BotContext>): void {
    this.bot = bot;
  }

  start(): void {
    this.startReminderPoller();
    this.scheduleFinanzasCrons();
    console.info('[Scheduler] Servicios de programación iniciados.');
  }

  private startReminderPoller(): void {
    setInterval(() => {
      void this.checkReminders();
    }, REMINDER_POLL_MS);
  }

  private async checkReminders(): Promise<void> {
    if (!this.bot || this.remindersRunning) return;
    this.remindersRunning = true;
    try {
      const now = new Date();
      const nowIso = this.toDateKey(now);
      const nowMinutes = this.toMinutes(now);

      for (const reminder of dataStore.getRecordatorios()) {
        if (reminder.fired) continue;

        const reminderDateKey = `${reminder.date}`;
        const reminderMinutes = this.toMinutesFromTime(reminder.time);

        if (reminderDateKey === nowIso && reminderMinutes === nowMinutes) {
          try {
            await this.bot.telegram.sendMessage(
              reminder.chatId,
              `*Recordatorio:*\n${this.escape(reminder.task)}`,
              { parse_mode: 'MarkdownV2' }
            );
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Error desconocido';
            console.error(`[Scheduler] No se pudo enviar recordatorio ${reminder.id}: ${msg}`);
          }
          dataStore.markRecordatorioFired(reminder.id);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      console.error(`[Scheduler] checkReminders falló: ${msg}`);
    } finally {
      this.remindersRunning = false;
    }
  }

  private scheduleFinanzasCrons(): void {
    // Fin de cada semana del mes (días 7, 14, 21, 28 o último día) a las 23:59.
    cron.schedule('59 23 * * *', () => {
      void this.sendWeeklyFinanzasSummary();
    });

    // Resumen del mes anterior el día 1 a las 20:00.
    cron.schedule('0 20 1 * *', () => {
      void this.sendMonthlyFinanzasSummary();
    });

    // Resumen anual el 1 de enero a las 20:10.
    cron.schedule('10 20 1 1 *', () => {
      void this.sendAnnualFinanzasSummary();
    });
  }

  private async sendWeeklyFinanzasSummary(): Promise<void> {
    if (!this.bot) return;
    try {
      const now = new Date();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const day = now.getDate();

      if (day % 7 !== 0 && day !== lastDay) return;
      await this.sendToUsers((userId, username, profile, txs) => buildWeeklyReport(username, profile, txs));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      console.error(`[Scheduler] sendWeeklyFinanzasSummary falló: ${msg}`);
    }
  }

  private async sendMonthlyFinanzasSummary(): Promise<void> {
    if (!this.bot) return;
    try {
      await this.sendToUsers((userId, username, profile, txs) => buildMonthlyReport(username, profile, txs));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      console.error(`[Scheduler] sendMonthlyFinanzasSummary falló: ${msg}`);
    }
  }

  private async sendAnnualFinanzasSummary(): Promise<void> {
    if (!this.bot) return;
    try {
      await this.sendToUsers((userId, username, profile, txs) => buildAnnualReport(username, profile, txs));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      console.error(`[Scheduler] sendAnnualFinanzasSummary falló: ${msg}`);
    }
  }

  private async sendToUsers(
    buildReport: (userId: number, username: string, profile: any, txs: any[]) => string
  ): Promise<void> {
    if (!this.bot) return;

    // Obtener todos los usuarios registrados
    const allTx = dataStore.getUserTransactions; // helper reference
    // Recorrer transacciones existentes agrupando por telegramId
    const userIds = new Set<number>();
    for (const pid of Object.keys(dataStore['data'].profiles)) {
      userIds.add(Number(pid));
    }

    for (const userId of userIds) {
      const profile = dataStore.getProfile(userId, 'Usuario');
      const txs = dataStore.getUserTransactions(userId);
      if (txs.length === 0) continue;

      const message = buildReport(userId, profile.usuario, profile, txs);
      try {
        await this.bot.telegram.sendMessage(userId, message, { parse_mode: 'MarkdownV2' });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        console.error(`[Scheduler] No se pudo enviar resumen de finanzas a ${userId}: ${msg}`);
      }
    }
  }

  private escape(text: string): string {
    return text.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
  }

  private toDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private toMinutes(date: Date): number {
    return date.getHours() * 60 + date.getMinutes();
  }

  private toMinutesFromTime(time: string): number {
    const [h, m] = time.split(':').map((n) => parseInt(n, 10));
    return (h ?? 0) * 60 + (m ?? 0);
  }
}

export const schedulerService = new SchedulerService();
