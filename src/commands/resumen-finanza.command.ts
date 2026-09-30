import { Telegraf, Markup } from 'telegraf';
import { BotContext } from '../types/bot.types.js';
import { commandTrigger } from '../utils/command-matcher.js';
import { deleteCommandMessage, safeReply } from '../utils/telegram-helpers.js';
import { dataStore } from '../services/data-store.service.js';
import {
  buildWeeklyReport,
  buildMonthlyReport,
  buildAnnualReport,
  buildCategoryReport,
} from '../utils/finanzas.js';
import { MESSAGES } from '../constants/messages.js';

function buildResumenKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(MESSAGES.RESUMEN_BTN_SEMANAL, 'finanza:resumen:semanal'),
      Markup.button.callback(MESSAGES.RESUMEN_BTN_MENSUAL, 'finanza:resumen:mensual'),
    ],
    [
      Markup.button.callback(MESSAGES.RESUMEN_BTN_ANUAL, 'finanza:resumen:anual'),
      Markup.button.callback(MESSAGES.RESUMEN_BTN_CATEGORIA, 'finanza:resumen:categoria'),
    ],
  ]);
}

export function registerResumenFinanzaCommand(bot: Telegraf<BotContext>): void {
  bot.hears(commandTrigger('resumen_finanza'), async (ctx) => {
    await ctx.reply(MESSAGES.RESUMEN_FINANZA_TITLE, {
      parse_mode: 'MarkdownV2',
      reply_markup: buildResumenKeyboard().reply_markup,
    });

    await deleteCommandMessage(ctx);
  });

  bot.action('finanza:resumen:semanal', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from?.id;
    if (!userId) return;

    const username = ctx.from.username ?? ctx.from.first_name ?? 'Usuario';
    const profile = dataStore.getProfile(userId, username);
    const transactions = dataStore.getUserTransactions(userId);

    const report = buildWeeklyReport(username, profile, transactions);
    await safeReply(ctx, report);
  });

  bot.action('finanza:resumen:mensual', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from?.id;
    if (!userId) return;

    const username = ctx.from.username ?? ctx.from.first_name ?? 'Usuario';
    const profile = dataStore.getProfile(userId, username);
    const transactions = dataStore.getUserTransactions(userId);

    const report = buildMonthlyReport(username, profile, transactions);
    await safeReply(ctx, report);
  });

  bot.action('finanza:resumen:anual', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from?.id;
    if (!userId) return;

    const username = ctx.from.username ?? ctx.from.first_name ?? 'Usuario';
    const profile = dataStore.getProfile(userId, username);
    const transactions = dataStore.getUserTransactions(userId);

    const report = buildAnnualReport(username, profile, transactions);
    await safeReply(ctx, report);
  });

  bot.action('finanza:resumen:categoria', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from?.id;
    if (!userId) return;

    const username = ctx.from.username ?? ctx.from.first_name ?? 'Usuario';
    const profile = dataStore.getProfile(userId, username);
    const transactions = dataStore.getUserTransactions(userId);

    const report = buildCategoryReport(username, profile, transactions);
    await safeReply(ctx, report);
  });
}
