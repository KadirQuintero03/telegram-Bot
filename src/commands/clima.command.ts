// import { Telegraf } from 'telegraf';
// import { BotContext } from '../types/bot.types.js';
// import { WeatherService } from '../services/weather.service.js';
// import { validateCityArg } from '../utils/validators.js';
// import { formatWeatherMessage } from '../utils/formatters.js';
// import { commandTrigger, getCommandArgs } from '../utils/commandMatcher.js';
// import { deleteCommandMessage } from '../utils/telegramHelpers.js';

// const weatherService = new WeatherService();

// export function registerClimaCommand(bot: Telegraf<BotContext>): void {
//   bot.hears(commandTrigger('clima'), async (ctx) => {
//     const args = getCommandArgs(ctx.message.text);
//     const validation = validateCityArg(args);

//     if (!validation.valid) {
//       await ctx.reply(validation.error ?? 'Error de validación.', { parse_mode: 'Markdown' });
//       await deleteCommandMessage(ctx);
//       return;
//     }

//     try {
//       await ctx.sendChatAction('typing');
//       const data = await weatherService.getWeather(validation.city!);
//       const message = formatWeatherMessage(data);
//       await ctx.reply(message, { parse_mode: 'MarkdownV2' });
//     } catch (error) {
//       const msg = error instanceof Error ? error.message : 'Error desconocido';
//       console.error(`[ERROR] /clima: ${msg}`);
//       await ctx.reply(`No pude obtener el clima\\. ${msg.includes('ciudad') ? msg : 'Intenta de nuevo más tarde\\.'}`, {
//         parse_mode: 'MarkdownV2',
//       });
//     } finally {
//       await deleteCommandMessage(ctx);
//     }
//   });
// }
