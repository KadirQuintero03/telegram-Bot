import { Telegraf } from 'telegraf';
import { BotContext } from '../types/bot.types.js';
import { commandTrigger } from '../utils/command-matcher.js';
import { deleteCommandMessage, safeReply } from '../utils/telegram-helpers.js';
import { systemService } from '../services/system.service.js';
import { MESSAGES } from '../constants/messages.js';

const MAX_MESSAGE_LENGTH = 3900;

export function registerEstadoCommand(bot: Telegraf<BotContext>): void {
  bot.hears(commandTrigger('estado'), async (ctx) => {
    try {
      await ctx.sendChatAction('typing');
      const message = await systemService.getSystemStatus();

      if (message.length > MAX_MESSAGE_LENGTH) {
        await sendAsDocument(ctx, message);
      } else {
        await safeReply(ctx, message);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      console.error(`[ERROR] /estado: ${msg}`);
      await safeReply(ctx, MESSAGES.ESTADO_ERROR);
    } finally {
      await deleteCommandMessage(ctx);
    }
  });
}

/** Envía el reporte como archivo .txt cuando excede el límite de Telegram. */
async function sendAsDocument(ctx: BotContext, content: string): Promise<void> {
  try {
    const plain = content.replace(/\\(.)/g, '$1');
    await ctx.replyWithDocument(
      { source: Buffer.from(plain, 'utf8'), filename: 'estado.txt' },
      { caption: 'Informe completo del sistema y hardware' }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    console.error(`[ERROR] /estado (documento): ${msg}`);
    await safeReply(ctx, content.slice(0, MAX_MESSAGE_LENGTH));
  }
}