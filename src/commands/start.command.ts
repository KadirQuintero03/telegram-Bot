import { Telegraf } from 'telegraf';
import { BotContext } from '../types/bot.types.js';
import { userRegistry } from '../services/userRegistry.service.js';
import { commandTrigger } from '../utils/commandMatcher.js';
import { deleteCommandMessage } from '../utils/telegramHelpers.js';

export function registerStartCommand(bot: Telegraf<BotContext>): void {
  bot.hears(commandTrigger('start'), async (ctx) => {
    const telegramId = ctx.from.id;
    const firstName = ctx.from.first_name ?? 'amigo';


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
      `🌐 /tra \\<texto\\> — Traducción al español \\(también respondiendo mensajes\\)\n` +
      `💵 /dolar \\[cantidad\\] — Precio o conversión del dólar a COP\n` +
      `🎙 /tran — Transcribe audios \\(respondiendo a una nota de voz\\)\n` +
      `📝 /resume — Resume texto, audio o imágenes\n` +
      `🤖 /ask \\<pregunta\\> — Pregúntale algo a la IA\n` +
      `📱 /phone — Vincula tu teléfono\n` +
      `🌐 /web — Obtén tu enlace de acceso a GlowPic\n` +
      `🗑 /borrar \\<N\\> — Eliminar mensajes en grupos\n` +
      `⏰ /recordatorio \\<frase\\> — Programa recordatorios en lenguaje natural\n` +
      `💸 /gasto \\<monto\\> \\<desc\\> — Registra un gasto\n` +
      `📊 /gastos_resumen — Resumen de gastos de la semana\n` +
      `🖥️ /estado — Métricas del sistema\n` +
      `⚙️ /ejecutar \\<cmd\\> — Comando de terminal \\(admin\\)\n` +
      `❓ /help — Ver ayuda completa\n\n` +
      `_También puedes enviarme imágenes, videos, audios y documentos para guardarlos\\._`,
      { parse_mode: 'MarkdownV2' }
    );

    await deleteCommandMessage(ctx);
  });
}
