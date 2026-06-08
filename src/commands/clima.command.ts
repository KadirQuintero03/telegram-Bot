import { Telegraf } from 'telegraf';
import { BotContext } from '../types/bot.types.js';
import { WeatherService } from '../services/weather.service.js';
import { validateCityArg } from '../utils/validators.js';
import { formatWeatherMessage } from '../utils/formatters.js';

const weatherService = new WeatherService();

export function registerClimaCommand(bot: Telegraf<BotContext>): void {
  bot.command('clima', async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1).join(' ');
    const validation = validateCityArg(args);

    if (!validation.valid) {
      await ctx.reply(validation.error ?? 'Error de validación.', { parse_mode: 'Markdown' });
      return;
    }

    try {
      await ctx.sendChatAction('typing');
      const data = await weatherService.getWeather(validation.city!);
      const message = formatWeatherMessage(data);
      await ctx.reply(message, { parse_mode: 'MarkdownV2' });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      console.error(`[ERROR] /clima: ${msg}`);
      await ctx.reply(`❌ No pude obtener el clima\\. ${msg.includes('ciudad') ? msg : 'Intenta de nuevo más tarde\\.'}`, {
        parse_mode: 'MarkdownV2',
      });
    }
  });
}
