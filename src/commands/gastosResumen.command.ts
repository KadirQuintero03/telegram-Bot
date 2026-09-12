import { Telegraf } from 'telegraf';
import { BotContext } from '../types/bot.types.js';
import { dataStore } from '../services/dataStore.service.js';
import { commandTrigger } from '../utils/commandMatcher.js';
import { deleteCommandMessage, safeReply } from '../utils/telegramHelpers.js';
import {
  MESES,
  buildCurrentMonthSummaryMessage,
  gastosInRange,
} from '../utils/gastos.js';

export function registerGastosResumenCommand(bot: Telegraf<BotContext>): void {
  const handler = async (ctx: BotContext): Promise<void> => {
    const chatId = ctx.chat?.id;

    deleteCommandMessage(ctx);

    if (!chatId) {
      await safeReply(ctx, 'No se pudo determinar el chat.');
      return;
    }

    const now = new Date();
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
    const gastos = gastosInRange(
      dataStore.getGastos().filter((g) => g.chatId === chatId),
      inicioMes,
      now
    );

    if (gastos.length === 0) {
      await safeReply(
        ctx,
        `No tienes gastos registrados en lo que va de *${MESES[now.getMonth()]}*\\.`
      );
      return;
    }

    await safeReply(
      ctx,
      buildCurrentMonthSummaryMessage(MESES[now.getMonth()]!, now.getFullYear(), gastos)
    );
  };

  bot.hears(commandTrigger('gastos_resumen'), handler);
  bot.hears(commandTrigger('gasto_resumen'), handler);
}