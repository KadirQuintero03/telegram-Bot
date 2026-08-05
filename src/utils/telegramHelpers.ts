import axios from 'axios';
import { BotContext } from '../types/bot.types.js';

export async function deleteCommandMessage(ctx: BotContext): Promise<void> {
  try {
    const chatId = ctx.chat?.id;
    const messageId = ctx.message?.message_id;
    if (!chatId || !messageId) return;
    await ctx.telegram.deleteMessage(chatId, messageId);
  } catch {


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
