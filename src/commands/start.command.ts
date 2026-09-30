import { Telegraf } from 'telegraf';
import { BotContext } from '../types/bot.types.js';
import { userRegistry } from '../services/user-registry.service.js';
import { commandTrigger } from '../utils/command-matcher.js';
import { deleteCommandMessage } from '../utils/telegram-helpers.js';
import { escapeMarkdown } from '../utils/formatters.js';
import { MESSAGES } from '../constants/messages.js';

export function registerStartCommand(bot: Telegraf<BotContext>): void {
  bot.hears(commandTrigger('start'), async (ctx) => {
    const telegramId = ctx.from.id;
    const firstName = ctx.from.first_name ?? 'amigo';

    const username =
      ctx.from.username ??
      `${ctx.from.first_name}${ctx.from.last_name ? '_' + ctx.from.last_name : ''}`;

    const alreadyRegistered = userRegistry.isRegistered(telegramId);
    userRegistry.registerUser(telegramId, username);

    const safeName = escapeMarkdown(firstName);
    const intro = alreadyRegistered
      ? MESSAGES.WELCOME_BACK(safeName)
      : MESSAGES.WELCOME_NEW(safeName);

    await ctx.reply(intro + MESSAGES.START_FOOTER, { parse_mode: 'MarkdownV2' });
    await deleteCommandMessage(ctx);
  });
}
