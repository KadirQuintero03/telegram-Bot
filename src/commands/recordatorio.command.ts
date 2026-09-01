import { Telegraf } from 'telegraf';
import { randomUUID } from 'crypto';
import { BotContext } from '../types/bot.types.js';
import { GeminiService } from '../services/gemini.service.js';
import { dataStore, Reminder } from '../services/dataStore.service.js';
import { commandTrigger, getCommandArgs } from '../utils/commandMatcher.js';
import { deleteCommandMessage } from '../utils/telegramHelpers.js';
import { escapeMarkdown } from '../utils/formatters.js';

const geminiService = new GeminiService();

const EXTRACTION_PROMPT =
  'Eres un asistente que extrae datos de recordatorios. ' +
  'A partir del texto, devuelve ÚNICAMENTE un objeto JSON válido con esta estructura exacta: ' +
  '{"tarea":"...","fecha":"AAAA-MM-DD","hora":"HH:MM"} . ' +
  'Interpreta frases naturales (ej: "mañana", "el lunes", "a las 8am"). ' +
  'Usa la fecha de HOY como referencia. No agregues texto adicional, solo el JSON.';

interface ParsedReminder {
  tarea: string;
  fecha: string;
  hora: string;
}

/** Usa Gemini para convertir texto natural en un recordatorio estructurado (tarea, fecha, hora). */
async function parseReminder(prompt: string): Promise<ParsedReminder | null> {
  try {
    const response = await geminiService.generateText(`${EXTRACTION_PROMPT}\nTexto: ${prompt}`);
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
      await ctx.reply('⚠️ Debes escribir un recordatorio. Ejemplo: `/recordatorio recuérdame revisar el correo mañana a las 8am`', {
        parse_mode: 'Markdown',
      });
      await deleteCommandMessage(ctx);
      return;
    }

    if (!chatId) {
      await ctx.reply('❌ No se pudo determinar el chat de destino.', { parse_mode: 'MarkdownV2' });
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
        `✅ *Recordatorio programado:* \n` +
        `"${formattedTask}" para el *${formattedDate}* a las *${formattedTime}*\\.`,
        { parse_mode: 'MarkdownV2' }
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      console.error(`[ERROR] /recordatorio: ${msg}`);
      await ctx.reply(`❌ No pude programar el recordatorio\\.\n${escapeMarkdown(msg)}`, {
        parse_mode: 'MarkdownV2',
      });
    } finally {
      await deleteCommandMessage(ctx);
    }
  });
}
