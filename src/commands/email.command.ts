import { Telegraf } from 'telegraf';
import { BotContext } from '../types/bot.types.js';
import { emailSessionService } from '../services/emailSession.service.js';
import { commandTrigger } from '../utils/commandMatcher.js';
import { deleteCommandMessage } from '../utils/telegramHelpers.js';

export function registerEmailCommand(bot: Telegraf<BotContext>): void {
    bot.hears(commandTrigger('email'), async (ctx) => {
        const userId = ctx.from?.id;
        if (!userId) return;

        emailSessionService.startSession(userId);

        await ctx.reply(
            '📧 *Envío de correo*\n\n' +
            '✏️ Escribe el correo de *destino*:',
            { parse_mode: 'MarkdownV2' }
        );

        await deleteCommandMessage(ctx);
    });
}