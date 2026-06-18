import { Telegraf } from 'telegraf';
import { BotContext } from '../types/bot.types.js';
import { emailSessionService } from '../services/emailSession.service.js';

export function registerEmailCommand(bot: Telegraf<BotContext>): void {
    bot.command('email', async (ctx) => {
        const userId = ctx.from?.id;
        if (!userId) return;

        emailSessionService.startSession(userId);

        await ctx.reply(
            '📧 *Envío de correo*\n\n' +
            '✏️ Escribe el correo de *destino*:',
            { parse_mode: 'MarkdownV2' }
        );
    });
}