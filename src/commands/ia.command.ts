import { Telegraf } from 'telegraf';
import { BotContext } from '../types/bot.types.js';
import { commandTrigger } from '../utils/command-matcher.js';
import { handleIaQuery } from './ask.command.js';

export function registerIaCommand(bot: Telegraf<BotContext>): void {
  bot.hears(commandTrigger('ia'), handleIaQuery);
}
