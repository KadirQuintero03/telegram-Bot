import { Telegraf } from 'telegraf';
import { BotContext } from '../types/bot.types.js';

export function registerStartCommand(bot: Telegraf<BotContext>): void {
  bot.command('start', async (ctx) => {
    const firstName = ctx.from?.first_name ?? 'amigo';
    const message =
      `👋 ¡Hola, *${firstName}*\\! Soy tu bot de asistencia\\.\n\n` +
      `Estoy *activo y listo* para ayudarte\\. Esto es lo que puedo hacer:\n\n` +
      `🌤 /clima — Consulta el clima de cualquier ciudad\n` +
      `🌐 /traducir — Traduce texto al español latinoamericano\n` +
      `🗑 /borrar — Elimina mensajes en grupos \\(solo admins\\)\n` +
      `❓ /help — Ver todos los comandos con ejemplos\n\n` +
      `_¡Escribe un comando para comenzar\\!_`;

    await ctx.reply(message, { parse_mode: 'MarkdownV2' });
  });
}
