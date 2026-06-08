import { Telegraf } from 'telegraf';
import { BotContext } from '../types/bot.types.js';
import { userRegistry } from '../services/userRegistry.service.js';

export function registerStartCommand(bot: Telegraf<BotContext>): void {
  bot.command('start', async (ctx) => {
    const telegramId = ctx.from.id;
    const firstName = ctx.from.first_name ?? 'amigo';

    // Usar @username si tiene, si no usar first_name como fallback
    const username =
      ctx.from.username ??
      `${ctx.from.first_name}${ctx.from.last_name ? '_' + ctx.from.last_name : ''}`;

    const alreadyRegistered = userRegistry.isRegistered(telegramId);
    userRegistry.registerUser(telegramId, username);

    const intro = alreadyRegistered
      ? `👋 ¡Bienvenido de nuevo, *${firstName}*\\!`
      : `🎉 ¡Hola, *${firstName}*\\! Tu carpeta personal ya está lista\\.`;

    await ctx.reply(
      intro + '\n\n' +
      `Estos son mis comandos disponibles:\n\n` +
      `🌤 /clima \\<ciudad\\> — Clima en tiempo real\n` +
      `🌐 /traducir \\<texto\\> — Traducción al español\n` +
      `🗑 /borrar \\<N\\> — Eliminar mensajes en grupos\n` +
      `❓ /help — Ver ayuda completa\n\n` +
      `_También puedes enviarme imágenes, videos, audios y documentos para guardarlos\\._`,
      { parse_mode: 'MarkdownV2' }
    );
  });
}