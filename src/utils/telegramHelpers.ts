import axios from 'axios';
import { BotContext } from '../types/bot.types.js';

/**
 * Elimina el mensaje que contenía el comando ejecutado por el usuario.
 * Se usa después de que el bot ya envió su respuesta, para que en el
 * chat solo quede la respuesta del bot y no el comando original.
 *
 * Si el bot no tiene permisos de administrador (grupos) o el mensaje
 * ya fue eliminado, la falla se ignora silenciosamente: no debe romper
 * el flujo del comando.
 */
export async function deleteCommandMessage(ctx: BotContext): Promise<void> {
  try {
    const chatId = ctx.chat?.id;
    const messageId = ctx.message?.message_id;
    if (!chatId || !messageId) return;
    await ctx.telegram.deleteMessage(chatId, messageId);
  } catch {
    // Sin permisos para borrar (chats privados no lo requieren, en grupos
    // hace falta ser admin) o el mensaje ya no existe. Se ignora.
  }
}

export interface TelegramFileData {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}

/**
 * Descarga un archivo de Telegram (audio, foto, documento, etc.) a partir
 * de su file_id y lo devuelve como Buffer listo para reenviar a otra API
 * (por ejemplo, Gemini).
 */
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
