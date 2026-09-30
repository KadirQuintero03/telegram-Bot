import { Telegraf } from 'telegraf';
import { BotContext } from '../types/bot.types.js';
import { gastoService } from '../services/gasto.service.js';
import { commandTrigger, getCommandArgs } from '../utils/command-matcher.js';
import { deleteCommandMessage, safeReply } from '../utils/telegram-helpers.js';
import { escapeMarkdown } from '../utils/formatters.js';
import { escapeCop } from '../utils/gastos.js';
import { MESSAGES } from '../constants/messages.js';

export function registerGastoCommand(bot: Telegraf<BotContext>): void {
  bot.hears(commandTrigger('gasto'), async (ctx) => {
    const args = getCommandArgs(ctx.message.text).trim();

    if (!args) {
      await ctx.reply(MESSAGES.GASTO_USAGE, { parse_mode: 'Markdown' });
      await deleteCommandMessage(ctx);
      return;
    }

    try {
      await ctx.sendChatAction('typing');
      const gasto = await gastoService.processAndSaveGasto(ctx, args);

      if (!gasto) {
        await ctx.reply(MESSAGES.GASTO_PARSE_ERROR, { parse_mode: 'Markdown' });
        await deleteCommandMessage(ctx);
        return;
      }

      await safeReply(
        ctx,
        `*Gasto registrado en pesos colombianos \\(COP\\)*\n` +
          `Monto: *$${escapeCop(gasto.monto)} COP*\n` +
          `Descripción: ${escapeMarkdown(gasto.descripcion)}\n` +
          `Categoría: *${escapeMarkdown(gasto.categoria)}*\n` +
          `Fecha: *${escapeMarkdown(gastoService.formatFechaDDMMAAAA(gasto.fecha))}*`
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      console.error(`[ERROR] /gasto: ${msg}`);
      await safeReply(ctx, MESSAGES.GASTO_ERROR);
    } finally {
      await deleteCommandMessage(ctx);
    }
  });
}
