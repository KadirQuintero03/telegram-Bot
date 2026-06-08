import { Telegraf } from 'telegraf';
import { BotContext } from '../types/bot.types.js';
import { TranslationService } from '../services/translation.service.js';
import { validateTranslateArg } from '../utils/validators.js';
import { formatTranslationMessage } from '../utils/formatters.js';

const translationService = new TranslationService();

export function registerTraducirCommand(bot: Telegraf<BotContext>): void {
  bot.command('traducir', async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1).join(' ');
    const validation = validateTranslateArg(args);

    if (!validation.valid) {
      await ctx.reply(validation.error ?? 'Error de validación.', { parse_mode: 'Markdown' });
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
    }
  });
}
