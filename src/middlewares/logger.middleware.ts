import { BotContext } from '../types/bot.types.js';

export function loggerMiddleware(ctx: BotContext, next: () => Promise<void>): Promise<void> {
  const timestamp = new Date().toISOString();
  const userId = ctx.from?.id ?? 'unknown';
  const username = ctx.from?.username ?? ctx.from?.first_name ?? 'unknown';
  const chatId = ctx.chat?.id ?? 'unknown';
  const chatType = ctx.chat?.type ?? 'unknown';

  let action = 'update';
  if (ctx.message && 'text' in ctx.message) {
    action = `message: "${ctx.message.text}"`;
  } else if (ctx.callbackQuery) {
    action = 'callback_query';
  }

  console.info(`[INFO] [${timestamp}] user=${userId}(${username}) chat=${chatId}(${chatType}) action=${action}`);

  return next();
}
