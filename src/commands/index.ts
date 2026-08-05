import { Telegraf } from 'telegraf';
import { BotContext } from '../types/bot.types.js';
import { registerStartCommand } from './start.command.js';
import { registerHelpCommand } from './help.command.js';
import { registerClimaCommand } from './clima.command.js';
import { registerTraCommand } from './tra.command.js';
import { registerBorrarCommand } from './borrar.command.js';
import { registerGetCommand } from './get.command.js';
import { registerEmailCommand } from './email.command.js';
import { registerCloudCommand } from './cloud.command.js';
import { registerDolarCommand } from './dolar.command.js';
import { registerTranCommand } from './tran.command.js';
import { registerResumeCommand } from './resume.command.js';
import { registerAskCommand } from './ask.command.js';
import { registerWebCommand } from './web.command.js';

export function registerAllCommands(bot: Telegraf<BotContext>): void {
  registerStartCommand(bot);
  registerHelpCommand(bot);
  registerClimaCommand(bot);
  registerTraCommand(bot);
  registerBorrarCommand(bot);
  registerGetCommand(bot);
  registerEmailCommand(bot);
  registerCloudCommand(bot);
  registerDolarCommand(bot);
  registerTranCommand(bot);
  registerResumeCommand(bot);
  registerAskCommand(bot);
  registerWebCommand(bot);
}
