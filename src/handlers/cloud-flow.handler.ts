import { Telegraf } from 'telegraf';
import { BotContext } from '../types/bot.types.js';
import { cloudSessionService } from '../services/cloud-session.service.js';
import { fileBrowserService } from '../services/file-browser.service.js';
import { sendFiles } from '../commands/cloud.command.js';
import { MESSAGES } from '../constants/messages.js';

export function registerCloudFlowHandler(bot: Telegraf<BotContext>): void {
  bot.on('text', async (ctx, next) => {
    const text = ctx.message.text;
    if (text.startsWith('/')) return next();

    const userId = ctx.from?.id;
    if (!userId) return next();

    const session = cloudSessionService.getSession(userId);
    if (!session.step) return next();

    if (!session.category || !session.userFolder) {
      cloudSessionService.updateSession(userId, { step: null });
      await ctx.reply(MESSAGES.CLOUD_EXPIRED, { parse_mode: 'MarkdownV2' });
      return;
    }

    const allFiles = fileBrowserService.listFiles(session.userFolder, session.category);
    const { page } = fileBrowserService.getPage(allFiles, session.offset);

    if (page.length === 0) {
      cloudSessionService.updateSession(userId, { step: null });
      await ctx.reply(MESSAGES.CLOUD_NO_FILES_PAGE, { parse_mode: 'MarkdownV2' });
      return;
    }

    try {
      if (session.step === 'awaiting_specific_range') {
        const match = text.trim().match(/^(\d+)\s*-\s*(\d+)$/);
        if (!match) {
          await ctx.reply(MESSAGES.CLOUD_INVALID_RANGE_FORMAT, { parse_mode: 'MarkdownV2' });
          return;
        }

        const start = parseInt(match[1]!, 10);
        const end = parseInt(match[2]!, 10);

        if (start < 1 || end < start || end > page.length) {
          await ctx.reply(`Rango inválido\\. Debe estar entre 1 y ${page.length}\\.`, {
            parse_mode: 'MarkdownV2',
          });
          return;
        }

        const selected = page.slice(start - 1, end).map((f) => f.fullPath);
        cloudSessionService.updateSession(userId, { step: null });
        await sendFiles(ctx, selected);
        return;
      }

      if (session.step === 'awaiting_unique_number') {
        const n = parseInt(text.trim(), 10);
        if (isNaN(n) || n < 1 || n > page.length) {
          await ctx.reply(`Número inválido\\. Debe estar entre 1 y ${page.length}\\.`, {
            parse_mode: 'MarkdownV2',
          });
          return;
        }

        const selected = page[n - 1]!.fullPath;
        cloudSessionService.updateSession(userId, { step: null });
        await sendFiles(ctx, [selected]);
        return;
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      console.error(`[ERROR] CloudFlow: ${msg}`);
      cloudSessionService.updateSession(userId, { step: null });
      await ctx.reply(MESSAGES.UNEXPECTED_ERROR_MD, { parse_mode: 'MarkdownV2' });
      return;
    }

    return next();
  });
}
