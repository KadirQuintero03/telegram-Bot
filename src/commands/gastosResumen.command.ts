import { Telegraf } from 'telegraf';
import { BotContext } from '../types/bot.types.js';
import { dataStore, Gasto } from '../services/dataStore.service.js';
import { commandTrigger } from '../utils/commandMatcher.js';
import { deleteCommandMessage } from '../utils/telegramHelpers.js';
import { escapeMarkdown } from '../utils/formatters.js';

export function registerGastosResumenCommand(bot: Telegraf<BotContext>): void {
  bot.hears(commandTrigger('gastos_resumen'), async (ctx) => {
    const chatId = ctx.chat?.id;

    deleteCommandMessage(ctx);

    if (!chatId) {
      await ctx.reply('❌ No se pudo determinar el chat.', { parse_mode: 'MarkdownV2' });
      return;
    }

    const gastos = dataStore
      .getGastos()
      .filter((g) => g.chatId === chatId)
      .filter((g) => isWithinLast7Days(new Date(g.fecha)));

    if (gastos.length === 0) {
      await ctx.reply('📭 No tienes gastos registrados en los últimos 7 días.', {
        parse_mode: 'MarkdownV2',
      });
      return;
    }

    const byCategory = groupByCategory(gastos);
    const lines = [...byCategory.entries()]
      .map(([categoria, total]) => `• *${escapeMarkdown(categoria)}*: $${total.toLocaleString('es-CO')}`)
      .join('\n');

    const total = gastos.reduce((sum, g) => sum + g.monto, 0);

    await ctx.reply(
      `📊 *Resumen de gastos \\(últimos 7 días\\)*\n\n` +
      `${lines}\n\n` +
      `TOTAL: *$${total.toLocaleString('es-CO')}*`,
      { parse_mode: 'MarkdownV2' }
    );
  });
}

/** Devuelve true si la fecha cae dentro de los últimos 7 días. */
function isWithinLast7Days(date: Date): boolean {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return date >= sevenDaysAgo && date <= new Date();
}

/** Agrupa una lista de gastos por categoría y suma el monto de cada una. */
function groupByCategory(gastos: Gasto[]): Map<string, number> {
  const byCategory = new Map<string, number>();
  for (const gasto of gastos) {
    byCategory.set(gasto.categoria, (byCategory.get(gasto.categoria) ?? 0) + gasto.monto);
  }
  return byCategory;
}
