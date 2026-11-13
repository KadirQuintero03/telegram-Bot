import { Telegraf } from 'telegraf';
import { randomUUID } from 'crypto';
import { BotContext } from '../types/bot.types.js';
import { GeminiService } from '../services/gemini.service.js';
import { dataStore, Reminder } from '../services/data-store.service.js';
import { commandTrigger, getCommandArgs } from '../utils/command-matcher.js';
import { deleteCommandMessage } from '../utils/telegram-helpers.js';
import { escapeMarkdown } from '../utils/formatters.js';
import { MESSAGES } from '../constants/messages.js';

const geminiService = new GeminiService();

const EXTRACTION_PROMPT =
  'Eres un asistente que extrae datos de recordatorios. ' +
  'A partir del texto, devuelve ÚNICAMENTE un objeto JSON válido con esta estructura exacta: ' +
  '{"tarea":"...","fecha":"AAAA-MM-DD","hora":"HH:MM"} . ' +
  'Interpreta frases naturales (ej: "mañana", "el lunes", "a las 8am", "en 2 horas"). ' +
  'Usa la fecha y hora de referencia actual provista para calcular la fecha y hora resultante. No agregues texto adicional, solo el JSON.';

interface ParsedReminder {
  tarea: string;
  fecha: string;
  hora: string;
}

async function parseReminder(prompt: string): Promise<ParsedReminder | null> {
  try {
    const now = new Date();
    const todayIso = now.toISOString().split('T')[0];
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const dayOfWeek = dayNames[now.getDay()];

    const contextInstruction =
      `${EXTRACTION_PROMPT}\n` +
      `[Referencia temporal actual: Hoy es ${dayOfWeek}, fecha: ${todayIso}, hora local: ${currentTime}]\n` +
      `Texto: ${prompt}`;

    const response = await geminiService.generateText(contextInstruction);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]) as ParsedReminder;
  } catch {
    return null;
  }
}

export function registerRecordatorioCommand(bot: Telegraf<BotContext>): void {
  bot.hears(commandTrigger('recordatorio'), async (ctx) => {
    const prompt = getCommandArgs(ctx.message.text).trim();
    const chatId = ctx.chat?.id;

    if (!prompt) {
      await ctx.reply(MESSAGES.REMINDER_USAGE, { parse_mode: 'Markdown' });
      await deleteCommandMessage(ctx);
      return;
    }

    if (!chatId) {
      await ctx.reply(MESSAGES.REMINDER_NO_CHAT, { parse_mode: 'MarkdownV2' });
      await deleteCommandMessage(ctx);
      return;
    }

    try {
      await ctx.sendChatAction('typing');

      const parsed = await parseReminder(prompt);
      if (!parsed) throw new Error('No se pudo interpretar la fecha y hora del recordatorio.');

      const reminder: Reminder = {
        id: randomUUID(),
        chatId,
        task: parsed.tarea,
        date: parsed.fecha,
        time: parsed.hora,
        createdAt: new Date().toISOString(),
        fired: false,
      };

      dataStore.addRecordatorio(reminder);

      const formattedDate = escapeMarkdown(parsed.fecha);
      const formattedTime = escapeMarkdown(parsed.hora);
      const formattedTask = escapeMarkdown(parsed.tarea);

      await ctx.reply(
        `*Recordatorio programado:* \n` +
          `"${formattedTask}" para el *${formattedDate}* a las *${formattedTime}*\\.`,
        { parse_mode: 'MarkdownV2' }
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      console.error(`[ERROR] /recordatorio: ${msg}`);
      await ctx.reply(MESSAGES.REMINDER_ERROR, { parse_mode: 'MarkdownV2' });
    } finally {
      await deleteCommandMessage(ctx);
    }
  });
}
