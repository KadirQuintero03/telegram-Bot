import { Telegraf } from 'telegraf';
import { BotContext } from '../types/bot.types.js';
import { dataStore } from './data-store.service.js';
import { escapeMarkdown } from '../utils/formatters.js';

const REMINDER_POLL_MS = 30_000;

class SchedulerService {
  private bot: Telegraf<BotContext> | null = null;
  private remindersRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  setBot(bot: Telegraf<BotContext>): void {
    this.bot = bot;
  }

  start(): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => {
      void this.checkReminders();
    }, REMINDER_POLL_MS);
    console.info('[Scheduler] Servicio de recordatorios iniciado.');
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async checkReminders(): Promise<void> {
    if (!this.bot || this.remindersRunning) return;
    this.remindersRunning = true;
    try {
      const now = new Date();
      const nowTotalMinutes = this.toDaysSinceEpoch(this.toDateKey(now)) * 1440 + this.toMinutes(now);

      for (const reminder of dataStore.getRecordatorios()) {
        if (reminder.fired) continue;

        const reminderDays = this.toDaysSinceEpoch(reminder.date);
        const reminderMinutes = this.toMinutesFromTime(reminder.time);
        const reminderTotalMinutes = reminderDays * 1440 + reminderMinutes;

        // Dispara si la hora programada ya llegó o pasó (evita perder recordatorios si el bot estuvo apagado)
        if (reminderTotalMinutes <= nowTotalMinutes) {
          try {
            await this.bot.telegram.sendMessage(
              reminder.chatId,
              `*Recordatorio:*\n${escapeMarkdown(reminder.task)}`,
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
    const [h, m] = (time ?? '0:0').split(':').map((n) => parseInt(n, 10));
    return (h ?? 0) * 60 + (m ?? 0);
  }

  private toDaysSinceEpoch(dateStr: string): number {
    const [y, m, d] = (dateStr ?? '').split('-').map((n) => parseInt(n, 10));
    if (!y || !m || !d) return 0;
    const dateUtc = Date.UTC(y, m - 1, d);
    return Math.floor(dateUtc / (1000 * 60 * 60 * 24));
  }
}

export const schedulerService = new SchedulerService();
