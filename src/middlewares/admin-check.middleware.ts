import { BotContext } from '../types/bot.types.js';
import { isGroup, isUserAdmin } from '../utils/telegram-helpers.js';

export async function adminCheckMiddleware(ctx: BotContext, next: () => Promise<void>): Promise<void> {
  if (!isGroup(ctx)) {
    await ctx.reply('Este comando solo está disponible en grupos.');
    return;
  }

  const isAdmin = await isUserAdmin(ctx);
  if (!isAdmin) {
    await ctx.reply('Solo los administradores del grupo pueden usar este comando.');
    return;
  }

  return next();
}
