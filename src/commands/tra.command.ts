import { Telegraf } from 'telegraf';
import { BotContext } from '../types/bot.types.js';
import { TranslationService } from '../services/translation.service.js';
import { validateTranslateArg } from '../utils/validators.js';
import { formatTranslationMessage } from '../utils/formatters.js';
import { commandTrigger, getCommandArgs } from '../utils/command-matcher.js';
import { deleteCommandMessage } from '../utils/telegram-helpers.js';
import { MESSAGES } from '../constants/messages.js';

const translationService = new TranslationService();

function resolveTextToTranslate(ctx: BotContext, args: string): { text?: string; error?: string } {
  const replyTo = ctx.message && 'reply_to_message' in ctx.message ? ctx.message.reply_to_message : undefined;

  if (replyTo) {
    const repliedText =
      ('text' in replyTo && replyTo.text) ||
      ('caption' in replyTo && replyTo.caption) ||
      undefined;

    if (!repliedText) {
      return { error: MESSAGES.TRA_USAGE };
    }
    return { text: repliedText };
  }

  return { text: args };
}

export function registerTraCommand(bot: Telegraf<BotContext>): void {
  bot.hears(commandTrigger('tra'), async (ctx) => {
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
      console.error(`[ERROR] /tra: ${msg}`);
      await ctx.reply(MESSAGES.TRA_ERROR, { parse_mode: 'MarkdownV2' });
    } finally {
      await deleteCommandMessage(ctx);
    }
  });
}
