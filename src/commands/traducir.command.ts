import { Telegraf } from 'telegraf';
import { BotContext } from '../types/bot.types.js';
import { TranslationService } from '../services/translation.service.js';
import { validateTranslateArg } from '../utils/validators.js';
import { formatTranslationMessage } from '../utils/formatters.js';
import { commandTrigger, getCommandArgs } from '../utils/commandMatcher.js';
import { deleteCommandMessage } from '../utils/telegramHelpers.js';

const translationService = new TranslationService();

/**
 * Obtiene el texto a traducir:
 * 1. Si el comando responde a un mensaje del chat, se traduce ESE mensaje
 *    (su texto o su caption si es una foto/video/documento con pie de foto).
 * 2. Si no hay mensaje respondido, se usa el texto que acompaña al comando,
 *    igual que antes (ej. "/traducir Hello").
 */
function resolveTextToTranslate(ctx: BotContext, args: string): { text?: string; error?: string } {
  const replyTo = ctx.message && 'reply_to_message' in ctx.message ? ctx.message.reply_to_message : undefined;

  if (replyTo) {
    const repliedText =
      ('text' in replyTo && replyTo.text) ||
      ('caption' in replyTo && replyTo.caption) ||
      undefined;

    if (!repliedText) {
      return {
        error:
          '⚠️ El mensaje al que respondiste no tiene texto para traducir\\.',
      };
    }
    return { text: repliedText };
  }

  return { text: args };
}

export function registerTraducirCommand(bot: Telegraf<BotContext>): void {
  bot.hears(commandTrigger('traducir'), async (ctx) => {
    const args = getCommandArgs(ctx.message.text);
    const resolved = resolveTextToTranslate(ctx, args);

    if (resolved.error) {
      await ctx.reply(resolved.error, { parse_mode: 'MarkdownV2' });
      await deleteCommandMessage(ctx);
      return;
    }

    const validation = validateTranslateArg(resolved.text);

    if (!validation.valid) {
      await ctx.reply(validation.error ?? 'Error de validación.', { parse_mode: 'Markdown' });
      await deleteCommandMessage(ctx);
      return;
    }

    try {
      await ctx.sendChatAction('typing');
      const result = await translationService.translate(validation.text!);
      const message = formatTranslationMessage(result);
      await ctx.reply(message, { parse_mode: 'MarkdownV2' });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      console.error(`[ERROR] /traducir: ${msg}`);
      await ctx.reply('❌ No pude traducir el texto\\. Intenta de nuevo más tarde\\.', {
        parse_mode: 'MarkdownV2',
      });
    } finally {
      await deleteCommandMessage(ctx);
    }
  });
}
