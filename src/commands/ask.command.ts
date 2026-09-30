import { Telegraf } from 'telegraf';
import { BotContext } from '../types/bot.types.js';
import { GeminiService } from '../services/gemini.service.js';
import { commandTrigger, getCommandArgs } from '../utils/command-matcher.js';
import { deleteCommandMessage } from '../utils/telegram-helpers.js';
import { escapeMarkdown } from '../utils/formatters.js';
import { MESSAGES } from '../constants/messages.js';

const geminiService = new GeminiService();

const IA_INSTRUCTION =
  'Responde la siguiente pregunta o instrucción en español, de forma breve y directa ' +
  '(máximo 4-6 líneas), sin rodeos ni texto de relleno. Si la pregunta requiere pasos, ' +
  'usa una lista corta:\n\n';

export async function handleIaQuery(ctx: BotContext): Promise<void> {
  const prompt = getCommandArgs(ctx.message && 'text' in ctx.message ? ctx.message.text : '').trim();

  if (!prompt) {
    await ctx.reply(MESSAGES.ASK_USAGE, { parse_mode: 'Markdown' });
    await deleteCommandMessage(ctx);
    return;
  }

  if (prompt.length > 1000) {
    await ctx.reply(MESSAGES.ASK_TOO_LONG, { parse_mode: 'MarkdownV2' });
    await deleteCommandMessage(ctx);
    return;
  }

  try {
    await ctx.sendChatAction('typing');
    const answer = await geminiService.generateText(`${IA_INSTRUCTION}${prompt}`);
    await ctx.reply(`*IA*\n\n${escapeMarkdown(answer)}`, { parse_mode: 'MarkdownV2' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    console.error(`[ERROR] AI command: ${msg}`);
    await ctx.reply(MESSAGES.ASK_ERROR, { parse_mode: 'MarkdownV2' });
  } finally {
    await deleteCommandMessage(ctx);
  }
}

export function registerAskCommand(bot: Telegraf<BotContext>): void {
  bot.hears(commandTrigger('ask'), handleIaQuery);
}
