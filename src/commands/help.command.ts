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
      `📌 Ejemplo: \`/borrar 10\`\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `_Rango de borrado: 1 a 100 mensajes_`;

    await ctx.reply(message, { parse_mode: 'MarkdownV2' });
  });
}
