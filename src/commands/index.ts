import { Telegraf } from 'telegraf';
import { BotContext } from '../types/bot.types.js';
import { registerStartCommand } from './start.command.js';
import { registerHelpCommand } from './help.command.js';
import { registerTraCommand } from './tra.command.js';
import { registerGetCommand } from './get.command.js';
import { registerCloudCommand } from './cloud.command.js';
import { registerDolarCommand } from './dolar.command.js';
import { registerAskCommand } from './ask.command.js';
import { registerIaCommand } from './ia.command.js';
import { registerRecordatorioCommand } from './recordatorio.command.js';
import { registerGastoCommand } from './gasto.command.js';
import { registerGastosResumenCommand } from './gastos-resumen.command.js';
import { registerEstadoCommand } from './estado.command.js';

export function registerAllCommands(bot: Telegraf<BotContext>): void {
  registerStartCommand(bot);
  registerHelpCommand(bot);
  registerTraCommand(bot);
  registerGetCommand(bot);
  registerCloudCommand(bot);
  registerDolarCommand(bot);
  registerAskCommand(bot);
  registerIaCommand(bot);
  registerRecordatorioCommand(bot);
  registerGastoCommand(bot);
  registerGastosResumenCommand(bot);
  registerEstadoCommand(bot);
}
