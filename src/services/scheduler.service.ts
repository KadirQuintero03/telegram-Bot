import cron from 'node-cron';
import { Telegraf } from 'telegraf';
import { BotContext } from '../types/bot.types.js';
import { dataStore, Gasto, Reminder } from './dataStore.service.js';
import {
  MESES,
  buildAnnualSummaryMessage,
  buildMonthlySummaryMessage,
  buildWeeklySummaryMessage,
  gastosInRange,
} from '../utils/gastos.js';

const REMINDER_POLL_MS = 30_000;

class SchedulerService {
    private bot: Telegraf<BotContext> | null = null;
    private remindersRunning = false;

    /** Asigna la instancia del bot para poder enviar mensajes automáticos. */
    setBot(bot: Telegraf<BotContext>): void {
        this.bot = bot;
    }

    /** Inicia el polling de recordatorios y los cron de resúmenes de gastos. */
    start(): void {
        this.startReminderPoller();
        this.scheduleGastosCrons();
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

    /** Programa los resúmenes automáticos de gastos: semanal (por mes), mensual y anual. */
    private scheduleGastosCrons(): void {
        // Fin de cada semana del mes (días 7, 14, 21, 28 o el último día del mes) a las 23:59.
        cron.schedule('59 23 * * *', () => {
            void this.sendWeeklyGastosSummary();
        });

        // Resumen del mes anterior, el día 1 de cada mes a las 20:00.
        cron.schedule('0 20 1 * *', () => {
            void this.sendMonthlyGastosSummary();
        });

        // Resumen anual del año anterior, el día 1 de enero a las 20:10.
        cron.schedule('10 20 1 1 *', () => {
            void this.sendAnnualGastosSummary();
        });
    }

    /** Envía el resumen de la semana del mes que termina hoy (días 1-7, 8-14, ...). */
    private async sendWeeklyGastosSummary(): Promise<void> {
        if (!this.bot) return;
        try {
            const now = new Date();
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const day = now.getDate();

            // Solo actúa cuando una semana del mes se completó.
            if (day % 7 !== 0 && day !== lastDay) return;

            const weekNumber = Math.ceil(day / 7);
            const startDay = (weekNumber - 1) * 7 + 1;
            const endDay = Math.min(weekNumber * 7, lastDay);

            const inicio = new Date(now.getFullYear(), now.getMonth(), startDay);
            const fin = new Date(now.getFullYear(), now.getMonth(), endDay, 23, 59, 59, 999);
            const gastos = gastosInRange(dataStore.getGastos(), inicio, fin);

            await this.sendToChats(gastos, (chatGastos) =>
                buildWeeklySummaryMessage(
                    MESES[now.getMonth()]!,
                    weekNumber,
                    startDay,
                    endDay,
                    chatGastos
                )
            );
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Error desconocido';
            console.error(`[Scheduler] sendWeeklyGastosSummary falló: ${msg}`);
        }
    }

    /** Envía el resumen del mes anterior el día 1 de cada mes. */
    private async sendMonthlyGastosSummary(): Promise<void> {
        if (!this.bot) return;
        try {
            const now = new Date();
            const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const inicio = new Date(prev.getFullYear(), prev.getMonth(), 1);
            const fin = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

            const gastos = gastosInRange(dataStore.getGastos(), inicio, fin);

            await this.sendToChats(gastos, (chatGastos) =>
                buildMonthlySummaryMessage(MESES[prev.getMonth()]!, prev.getFullYear(), chatGastos)
            );
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Error desconocido';
            console.error(`[Scheduler] sendMonthlyGastosSummary falló: ${msg}`);
        }
    }

    /** Envía el resumen anual del año anterior, desglosado por meses, cada 1 de enero. */
    private async sendAnnualGastosSummary(): Promise<void> {
        if (!this.bot) return;
        try {
            const now = new Date();
            const prevYear = now.getFullYear() - 1;
            const inicio = new Date(prevYear, 0, 1);
            const fin = new Date(prevYear, 11, 31, 23, 59, 59, 999);

            const gastos = gastosInRange(dataStore.getGastos(), inicio, fin);

            await this.sendToChats(gastos, (chatGastos) => buildAnnualSummaryMessage(prevYear, chatGastos));
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Error desconocido';
            console.error(`[Scheduler] sendAnnualGastosSummary falló: ${msg}`);
        }
    }

    /** Envía a cada chat una versión del mensaje construida con sus gastos del período. */
    private async sendToChats(gastos: Gasto[], build: (chatGastos: Gasto[]) => string): Promise<void> {
        if (!this.bot || gastos.length === 0) return;

        const chats = new Set(gastos.map((g) => g.chatId));
        for (const chatId of chats) {
            const chatGastos = gastos.filter((g) => g.chatId === chatId);
            if (chatGastos.length === 0) continue;

            const message = build(chatGastos);
            try {
                await this.bot.telegram.sendMessage(chatId, message, { parse_mode: 'MarkdownV2' });
            } catch (err) {
                const msg = err instanceof Error ? err.message : 'Error desconocido';
                console.error(`[Scheduler] No se pudo enviar resumen de gastos a ${chatId}: ${msg}`);
            }
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
