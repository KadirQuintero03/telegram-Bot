import cron from 'node-cron';
import { Telegraf } from 'telegraf';
import { BotContext } from '../types/bot.types.js';
import { dataStore, Reminder } from './dataStore.service.js';

const REMINDER_POLL_MS = 30_000;

class SchedulerService {
    private bot: Telegraf<BotContext> | null = null;
    private remindersRunning = false;

    /** Asigna la instancia del bot para poder enviar mensajes automáticos. */
    setBot(bot: Telegraf<BotContext>): void {
        this.bot = bot;
    }

    /** Inicia el polling de recordatorios y los cron semanales. */
    start(): void {
        this.startReminderPoller();
        this.scheduleWeeklyGastosSummary();
        console.info('[Scheduler] Servicios de programación iniciados.');
    }

    /** Lanza un intervalo que revisa recordatorios vencidos cada 30s. */
    private startReminderPoller(): void {
        setInterval(() => {
            void this.checkReminders();
        }, REMINDER_POLL_MS);
    }

    /** Recorre recordatorios pendientes y envía los que coinciden con la hora actual. */
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

    /** Programa el resumen de gastos semanal cada domingo a las 20:00. */
    private scheduleWeeklyGastosSummary(): void {
        cron.schedule('0 20 * * 0', () => {
            void this.sendWeeklyGastosSummary();
        });
    }

    /** Envía a cada usuario el balance de gastos de los últimos 7 días. */
    private async sendWeeklyGastosSummary(): Promise<void> {
        if (!this.bot) return;
        try {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const gastos = dataStore.getGastos().filter((g) => {
                const fecha = new Date(g.fecha);
                return fecha >= sevenDaysAgo;
            });

            if (gastos.length === 0) return;

            const byCategory = new Map<string, number>();
            for (const gasto of gastos) {
                byCategory.set(gasto.categoria, (byCategory.get(gasto.categoria) ?? 0) + gasto.monto);
            }

            const lines = [...byCategory.entries()].map(
                ([categoria, total]) => `• *${this.escape(categoria)}*: $${this.escape(total.toLocaleString('es-CO'))}`
            );

            const total = gastos.reduce((sum, g) => sum + g.monto, 0);

            for (const chatId of new Set(gastos.map((g) => g.chatId))) {
                const message =
                    `*Resumen semanal de gastos*\n\n` +
                    `${lines}\n\n` +
                    `TOTAL: *$${this.escape(total.toLocaleString('es-CO'))}*`;
                try {
                    await this.bot.telegram.sendMessage(chatId, message, { parse_mode: 'MarkdownV2' });
                } catch (err) {
                    const msg = err instanceof Error ? err.message : 'Error desconocido';
                    console.error(`[Scheduler] No se pudo enviar resumen semanal a ${chatId}: ${msg}`);
                }
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Error desconocido';
            console.error(`[Scheduler] sendWeeklyGastosSummary falló: ${msg}`);
        }
    }

    /** Escapa caracteres reservados de MarkdownV2. */
    private escape(text: string): string {
        return text.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
    }

    /** Formatea una fecha como YYYY-MM-DD local. */
    private toDateKey(date: Date): string {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    /** Convierte una fecha a minutos desde medianoche. */
    private toMinutes(date: Date): number {
        return date.getHours() * 60 + date.getMinutes();
    }

    /** Convierte una hora HH:MM a minutos desde medianoche. */
    private toMinutesFromTime(time: string): number {
        const [h, m] = time.split(':').map((n) => parseInt(n, 10));
        return h * 60 + m;
    }
}

export const schedulerService = new SchedulerService();
