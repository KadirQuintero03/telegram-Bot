import { Telegraf } from 'telegraf';
import { BotContext } from '../types/bot.types.js';
import { dataStore } from '../services/data-store.service.js';
import { commandTrigger } from '../utils/command-matcher.js';
import { deleteCommandMessage, safeReply } from '../utils/telegram-helpers.js';
import {
  MESES,
  buildCurrentMonthSummaryMessage,
  gastosInRange,
} from '../utils/gastos.js';
import { MESSAGES } from '../constants/messages.js';

export function registerGastosResumenCommand(bot: Telegraf<BotContext>): void {
  const handler = async (ctx: BotContext): Promise<void> => {
    const chatId = ctx.chat?.id;

    deleteCommandMessage(ctx);

    if (!chatId) {
      await safeReply(ctx, MESSAGES.GASTO_RESUMEN_NO_CHAT);
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
        MESSAGES.GASTO_RESUMEN_EMPTY(MESES[now.getMonth()]!)
      );
      return;
    }

    await safeReply(
      ctx,
      buildCurrentMonthSummaryMessage(MESES[now.getMonth()]!, now.getFullYear(), gastos)
    );
  };

  bot.hears(commandTrigger('gasto_resumen'), handler);
}
