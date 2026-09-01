import { Telegraf } from 'telegraf';
import { BotContext } from './types/bot.types.js';
import { config } from './config/env.js';
import { loggerMiddleware } from './middlewares/logger.middleware.js';
import { registerAllCommands } from './commands/index.js';
import { registerMediaHandlers } from './handlers/media.handler.js';
import { registerEmailFlowHandler } from './handlers/emailFlow.handler.js';
import { registerCloudFlowHandler } from './handlers/cloudFlow.handler.js';
import { schedulerService } from './services/scheduler.service.js';

export function createBot(): Telegraf<BotContext> {
  const bot = new Telegraf<BotContext>(config.botToken);

  bot.use(loggerMiddleware);

  registerAllCommands(bot);
  registerEmailFlowHandler(bot);
  registerCloudFlowHandler(bot);
  registerMediaHandlers(bot);

  schedulerService.setBot(bot);
  schedulerService.start();

  bot.catch((err, ctx) => {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error(`[ERROR] Update ${ctx.update.update_id} provocó error: ${error.message}`);
    console.error(error.stack);

    ctx.reply('😕 Ocurrió un error inesperado. Por favor intenta de nuevo.').catch(() => {
      console.error('[ERROR] No se pudo enviar el mensaje de error al usuario.');
    });
  });

  return bot;
}