import { Telegraf } from 'telegraf';
import { BotContext } from '../types/bot.types.js';

export function registerHelpCommand(bot: Telegraf<BotContext>): void {
  bot.command('help', async (ctx) => {
    const message =
      `📖 *Guía de comandos*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🚀 */start*\n` +
      `Verifica que el bot esté activo y muestra bienvenida\\.\n\n` +
      `🌤 */clima \\<ciudad\\>*\n` +
      `Consulta el clima actual de una ciudad\\.\n` +
      `📌 Ejemplo: \`/clima Bogotá\`\n\n` +
      `🌐 */traducir \\<texto\\>*\n` +
      `Traduce cualquier texto al español latinoamericano\\.\n` +
      `Detecta el idioma automáticamente\\.\n` +
      `📌 Ejemplo: \`/traducir Hello, how are you?\`\n\n` +
      `🗑 */borrar \\<N\\>*\n` +
      `Elimina los últimos N mensajes del grupo\\.\n` +
      `Solo disponible para administradores en grupos\\.\n` +
      `📌 Ejemplo: \`/borrar 10\`\n\n` +
      `📥 */get \\<enlace\\>*\n` +
      `Descarga un video de TikTok y lo guarda en tu carpeta personal\\.\n` +
      `📌 Ejemplo: \`/get https://vm.tiktok.com/XXXXXXX\`\n\n` +
      `☁️ */cloud*\n` +
      `Muestra un menú para explorar tus archivos guardados \\(imágenes, videos, audios o documentos\\)\\.\n` +
      `Permite ver cuántos archivos tienes, su peso total, y recibirlos de nuevo en el chat\\.\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `_Rango de borrado: 1 a 100 mensajes_`;

    await ctx.reply(message, { parse_mode: 'MarkdownV2' });
  });
}