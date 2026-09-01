import { Telegraf } from 'telegraf';
import { BotContext } from '../types/bot.types.js';
import { DolarService } from '../services/dolar.service.js';
import { validateDolarArg } from '../utils/validators.js';
import { formatDolarConversionMessage, formatDolarRateMessage } from '../utils/formatters.js';
import { commandTrigger, getCommandArgs } from '../utils/commandMatcher.js';
import { deleteCommandMessage } from '../utils/telegramHelpers.js';

const dolarService = new DolarService();

export function registerDolarCommand(bot: Telegraf<BotContext>): void {
  bot.hears(commandTrigger('dolar'), async (ctx) => {
    const args = getCommandArgs(ctx.message.text);
    const validation = validateDolarArg(args);

    if (!validation.valid) {
      await ctx.reply(validation.error ?? 'Error de validación.', { parse_mode: 'Markdown' });
      await deleteCommandMessage(ctx);
      return;
    }

    try {
      await ctx.sendChatAction('typing');

      if (validation.amount === undefined) {

        const rate = await dolarService.getRate();
        await ctx.reply(formatDolarRateMessage(rate), { parse_mode: 'MarkdownV2' });
      } else {

        const conversion = await dolarService.convert(validation.amount);
        await ctx.reply(formatDolarConversionMessage(conversion), { parse_mode: 'MarkdownV2' });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      console.error(`[ERROR] /dolar: ${msg}`);
      await ctx.reply('No pude obtener el valor del dólar\\. Intenta de nuevo más tarde\\.', {
        parse_mode: 'MarkdownV2',
      });
    } finally {
      await deleteCommandMessage(ctx);
    }
  });
}
