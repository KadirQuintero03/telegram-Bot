import { Telegraf, Markup } from 'telegraf';
import { BotContext } from '../types/bot.types.js';
import { commandTrigger } from '../utils/command-matcher.js';
import { deleteCommandMessage } from '../utils/telegram-helpers.js';
import { userRegistry } from '../services/user-registry.service.js';
import { finanzaSessionService } from '../services/finanza-session.service.js';
import { MESSAGES } from '../constants/messages.js';

function buildFinanzaKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(MESSAGES.FINANZA_BTN_GASTO, 'finanza:action:gasto'),
      Markup.button.callback(MESSAGES.FINANZA_BTN_INGRESO, 'finanza:action:ingreso'),
    ],
    [
      Markup.button.callback(MESSAGES.FINANZA_BTN_VOICE, 'finanza:action:voice'),
    ],
  ]);
}

export function registerFinanzaCommand(bot: Telegraf<BotContext>): void {
  bot.hears(commandTrigger('finanza'), async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const username =
      ctx.from.username ??
      `${ctx.from.first_name}${ctx.from.last_name ? '_' + ctx.from.last_name : ''}`;

    userRegistry.registerUser(telegramId, username);
    finanzaSessionService.clearSession(telegramId);

    await ctx.reply(MESSAGES.FINANZA_PROMPT, {
      parse_mode: 'MarkdownV2',
      reply_markup: buildFinanzaKeyboard().reply_markup,
    });

    await deleteCommandMessage(ctx);
  });

  bot.action('finanza:action:gasto', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from?.id;
    if (!userId) return;

    finanzaSessionService.setStep(userId, 'awaiting_gasto_text');
    await ctx.reply(MESSAGES.FINANZA_GASTO_INSTR, { parse_mode: 'Markdown' });
  });

  bot.action('finanza:action:ingreso', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from?.id;
    if (!userId) return;

    finanzaSessionService.setStep(userId, 'awaiting_ingreso_text');
    await ctx.reply(MESSAGES.FINANZA_INGRESO_INSTR, { parse_mode: 'Markdown' });
  });

  bot.action('finanza:action:voice', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from?.id;
    if (!userId) return;

    finanzaSessionService.setStep(userId, 'awaiting_voice');
    await ctx.reply(MESSAGES.FINANZA_VOICE_INSTR, { parse_mode: 'MarkdownV2' });
  });
}
