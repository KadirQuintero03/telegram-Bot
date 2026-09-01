import { Telegraf } from 'telegraf';
import { randomUUID } from 'crypto';
import { BotContext } from '../types/bot.types.js';
import { GeminiService } from '../services/gemini.service.js';
import { dataStore, Gasto } from '../services/dataStore.service.js';
import { commandTrigger, getCommandArgs } from '../utils/commandMatcher.js';
import { deleteCommandMessage, safeReply } from '../utils/telegramHelpers.js';
import { escapeMarkdown } from '../utils/formatters.js';

const geminiService = new GeminiService();

const CATEGORY_PROMPT =
  'Clasifica el siguiente gasto en UNA sola categoría de esta lista: ' +
  'Comida, Transporte, Servicios, Ocio, Salud, Educación, Otros. ' +
  'Responde ÚNICAMENTE con el nombre de la categoría, sin puntos ni texto extra.';

export function registerGastoCommand(bot: Telegraf<BotContext>): void {
  bot.hears(commandTrigger('gasto'), async (ctx) => {
    const args = getCommandArgs(ctx.message.text).trim();
    const chatId = ctx.chat?.id;

    if (!args) {
      await ctx.reply('⚠️ Debes indicar cantidad y descripción. Ejemplo: `/gasto 15000 almuerzo`', {
        parse_mode: 'Markdown',
      });
      await deleteCommandMessage(ctx);
      return;
    }

    const { monto, descripcion } = parseGasto(args);
    if (monto === null || !descripcion) {
      await ctx.reply('⚠️ Formato inválido. Ejemplo: `/gasto 15000 almuerzo`', {
        parse_mode: 'Markdown',
      });
      await deleteCommandMessage(ctx);
      return;
    }

    try {
      await ctx.sendChatAction('typing');
      const categoria = await classifyCategory(descripcion);

      const gasto: Gasto = {
        id: randomUUID(),
        chatId: chatId ?? 0,
        monto,
        descripcion,
        categoria,
        fecha: new Date().toISOString(),
      };

      dataStore.addGasto(gasto);

      const formattedMonto = monto.toLocaleString('es-CO');
      await safeReply(
        ctx,
        `✅ *Gasto registrado*\n` +
        `💰 Monto: *${escapeMarkdown(formattedMonto)}*\n` +
        `📝 Descripción: ${escapeMarkdown(descripcion)}\n` +
        `🏷 Categoría: *${escapeMarkdown(categoria)}*`
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      console.error(`[ERROR] /gasto: ${msg}`);
      await safeReply(ctx, `❌ No pude registrar el gasto\\.\n${escapeMarkdown(msg)}`);
    } finally {
      await deleteCommandMessage(ctx);
    }
  });
}

/** Extrae el monto numérico y la descripción de los argumentos del comando /gasto. */
function parseGasto(args: string): { monto: number | null; descripcion: string } {
  const match = args.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/);
  if (!match) return { monto: null, descripcion: '' };

  const monto = parseFloat(match[1]!.replace(',', '.'));
  if (Number.isNaN(monto) || monto <= 0) return { monto: null, descripcion: '' };

  return { monto, descripcion: match[2]!.trim() };
}

/** Pide a Gemini la categoría del gasto; si falla o no es válida, devuelve "Otros". */
async function classifyCategory(descripcion: string): Promise<string> {
  try {
    const response = await geminiService.generateText(`${CATEGORY_PROMPT}\nGasto: ${descripcion}`);
    const clean = response.trim().replace(/[.\n]/g, '');
    const valid = ['Comida', 'Transporte', 'Servicios', 'Ocio', 'Salud', 'Educación', 'Otros'];
    return valid.find((c) => c.toLowerCase() === clean.toLowerCase()) ?? 'Otros';
  } catch {
    return 'Otros';
  }
}
