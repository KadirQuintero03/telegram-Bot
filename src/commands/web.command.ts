import { Telegraf } from 'telegraf';
import { BotContext } from '../types/bot.types.js';
import { userRegistry } from '../services/userRegistry.service.js';
import { commandTrigger } from '../utils/commandMatcher.js';
import { deleteCommandMessage } from '../utils/telegramHelpers.js';
import { escapeMarkdown } from '../utils/formatters.js';

const WEB_LINK = 'https://www.instagram.com/';

export function registerWebCommand(bot: Telegraf<BotContext>): void {
  bot.hears(commandTrigger('web'), async (ctx) => {
    const telegramId = ctx.from.id;

    try {
      if (!userRegistry.hasPhone(telegramId)) {
        await ctx.reply(
          '📱 Primero debes vincular tu número de teléfono con /phone\\.',
          { parse_mode: 'MarkdownV2' }
        );
        return;
      }

      await ctx.reply(`🌐 Aquí tienes tu enlace:\n${WEB_LINK}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      console.error(`[ERROR] /web: ${msg}`);
      await ctx.reply(`❌ Ocurrió un problema al procesar /web\\.\n${escapeMarkdown(msg)}`, {
        parse_mode: 'MarkdownV2',
      });
    } finally {
      await deleteCommandMessage(ctx);
    }
  });
}
