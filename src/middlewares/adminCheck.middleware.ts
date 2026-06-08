import { BotContext } from '../types/bot.types.js';
import { TelegramService } from '../services/telegram.service.js';

export async function adminCheckMiddleware(ctx: BotContext, next: () => Promise<void>): Promise<void> {
  // Solo aplica en grupos
  if (!TelegramService.isGroup(ctx)) {
    await ctx.reply('⚠️ Este comando solo está disponible en grupos.');
    return;
  }

  const isAdmin = await TelegramService.isUserAdmin(ctx);
  if (!isAdmin) {
    await ctx.reply('🚫 Solo los administradores del grupo pueden usar este comando.');
    return;
  }

  return next();
}
