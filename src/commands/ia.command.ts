import { Telegraf } from 'telegraf';
import { BotContext } from '../types/bot.types.js';
import { GeminiService } from '../services/gemini.service.js';
import { commandTrigger, getCommandArgs } from '../utils/commandMatcher.js';
import { deleteCommandMessage } from '../utils/telegramHelpers.js';
import { escapeMarkdown } from '../utils/formatters.js';

const geminiService = new GeminiService();

const IA_INSTRUCTION =
  'Responde la siguiente pregunta o instrucción en español, de forma breve y directa '+
  '(máximo 4-6 líneas), sin rodeos ni texto de relleno. Si la pregunta requiere pasos, '+
  'usa una lista corta:\n\n';

export function registerIaCommand(bot: Telegraf<BotContext>): void {
  bot.hears(commandTrigger('ia'), async (ctx) => {
    const prompt = getCommandArgs(ctx.message.text).trim();

    if (!prompt) {
      await ctx.reply('Debes escribir una pregunta. Ejemplo: `/ia Cómo hacer un asado?`', {
        parse_mode: 'Markdown',
      });
      await deleteCommandMessage(ctx);
      return;
    }

    if (prompt.length > 1000) {
      await ctx.reply('La pregunta es demasiado larga \\(máximo 1000 caracteres\\)\\.', {
        parse_mode: 'MarkdownV2',
      });
      await deleteCommandMessage(ctx);
      return;
    }

    try {
      await ctx.sendChatAction('typing');
      const answer = await geminiService.generateText(`${IA_INSTRUCTION}${prompt}`);
      await ctx.reply(`*IA*\n\n${escapeMarkdown(answer)}`, { parse_mode: 'MarkdownV2' });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      console.error(`[ERROR] /ia: ${msg}`);
      await ctx.reply(`No pude obtener una respuesta de la IA\\.\n${escapeMarkdown(msg)}`, {
        parse_mode: 'MarkdownV2',
      });
    } finally {
      await deleteCommandMessage(ctx);
    }
  });
}
