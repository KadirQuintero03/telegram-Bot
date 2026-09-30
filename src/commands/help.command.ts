import { Telegraf } from 'telegraf';
import { BotContext } from '../types/bot.types.js';
import { commandTrigger } from '../utils/command-matcher.js';
import { deleteCommandMessage } from '../utils/telegram-helpers.js';
import { MESSAGES } from '../constants/messages.js';

export function registerHelpCommand(bot: Telegraf<BotContext>): void {
  bot.hears(commandTrigger('help'), async (ctx) => {
    await ctx.reply(MESSAGES.HELP_GUIDE, { parse_mode: 'MarkdownV2' });
    await deleteCommandMessage(ctx);
  });
}
