import axios from 'axios';
import { Context } from 'telegraf';
import { BotContext } from '../types/bot.types.js';

export async function deleteCommandMessage(ctx: BotContext): Promise<void> {
  try {
    const chatId = ctx.chat?.id;
    const messageId = ctx.message?.message_id;
    if (!chatId || !messageId) return;
    await ctx.telegram.deleteMessage(chatId, messageId);
  } catch {
    // Ignorar si el mensaje ya fue eliminado o no se tienen permisos
  }
}

/**
 * Envía un mensaje de forma segura: intenta MarkdownV2 y, si Telegram lo rechaza
 * por caracteres sin escapar, reintenta con formato HTML y finalmente en texto plano.
 * Nunca lanza errores para evitar bucles de reintento.
 */
export async function safeReply(ctx: BotContext, text: string): Promise<void> {
  try {
    await ctx.reply(text, { parse_mode: 'MarkdownV2' });
    return;
  } catch {
    // fallback a HTML
  }
  try {
    await ctx.reply(text, { parse_mode: 'HTML' });
    return;
  } catch {
    // fallback a texto plano
  }
  try {
    await ctx.reply(text);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    console.error(`[safeReply] No se pudo enviar el mensaje: ${msg}`);
  }
}

export interface TelegramFileData {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}

export async function downloadTelegramFile(
  ctx: BotContext,
  fileId: string,
  fallbackMimeType: string,
  fallbackName: string
): Promise<TelegramFileData> {
  const file = await ctx.telegram.getFile(fileId);
  const token = ctx.telegram.token;
  const url = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

  const response = await axios.get<ArrayBuffer>(url, {
    responseType: 'arraybuffer',
    timeout: 30000,
  });

  return {
    buffer: Buffer.from(response.data),
    mimeType: fallbackMimeType,
    fileName: fallbackName,
  };
}

export async function isBotAdmin(ctx: Context): Promise<boolean> {
  try {
    if (!ctx.chat) return false;
    const botId = ctx.botInfo?.id;
    if (!botId) return false;
    const member = await ctx.telegram.getChatMember(ctx.chat.id, botId);
    return member.status === 'administrator' || member.status === 'creator';
  } catch {
    return false;
  }
}

export async function isUserAdmin(ctx: Context): Promise<boolean> {
  try {
    if (!ctx.chat || !ctx.from) return false;
    const member = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);
    return member.status === 'administrator' || member.status === 'creator';
  } catch {
    return false;
  }
}

export function isGroup(ctx: Context): boolean {
  return ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup';
}
