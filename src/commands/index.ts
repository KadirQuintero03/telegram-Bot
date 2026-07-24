import { Telegraf } from 'telegraf';
import { BotContext } from '../types/bot.types.js';
import { registerStartCommand } from './start.command.js';
import { registerHelpCommand } from './help.command.js';
import { registerClimaCommand } from './clima.command.js';
import { registerTraducirCommand } from './traducir.command.js';
import { registerBorrarCommand } from './borrar.command.js';
import { registerGetCommand } from './get.command.js';
import { registerEmailCommand } from './email.command.js';
import { registerCloudCommand } from './cloud.command.js';
import { registerDolarCommand } from './dolar.command.js';
import { registerTranCommand } from './tran.command.js';
import { registerResumenCommand } from './resumen.command.js';
import { registerIaCommand } from './ia.command.js';

export function registerAllCommands(bot: Telegraf<BotContext>): void {
  registerStartCommand(bot);
  registerHelpCommand(bot);
  registerClimaCommand(bot);
  registerTraducirCommand(bot);
  registerBorrarCommand(bot);
  registerGetCommand(bot);
  registerEmailCommand(bot);
  registerCloudCommand(bot);
  registerDolarCommand(bot);
  registerTranCommand(bot);
  registerResumenCommand(bot);
  registerIaCommand(bot);
}
