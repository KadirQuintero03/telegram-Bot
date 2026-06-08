import { Telegraf } from 'telegraf';
import { BotContext } from '../types/bot.types.js';
import { TelegramService } from '../services/telegram.service.js';
import { validateDeleteArg } from '../utils/validators.js';
import { config } from '../config/env.js';

export function registerBorrarCommand(bot: Telegraf<BotContext>): void {
  bot.command('borrar', async (ctx) => {
    // Solo en grupos
    if (!TelegramService.isGroup(ctx)) {
      await ctx.reply('⚠️ El comando `/borrar` solo está disponible en grupos\\.', {
        parse_mode: 'MarkdownV2',
      });
      return;
    }

    // Verificar que el usuario sea admin
    const isUserAdmin = await TelegramService.isUserAdmin(ctx);
    if (!isUserAdmin) {
      await ctx.reply('🚫 Solo los *administradores* del grupo pueden usar este comando\\.', {
        parse_mode: 'MarkdownV2',
      });
      return;
    }

    // Verificar que el bot sea admin
    const isBotAdmin = await TelegramService.isBotAdmin(ctx);
    if (!isBotAdmin) {
      await ctx.reply(
        '⚠️ Necesito ser *administrador* del grupo para poder eliminar mensajes\\.',
        { parse_mode: 'MarkdownV2' }
      );
      return;
    }

    const args = ctx.message.text.split(' ').slice(1).join(' ');
    const validation = validateDeleteArg(args, config.maxDeleteMessages);

    if (!validation.valid) {
      await ctx.reply(validation.error ?? 'Error de validación\\.', { parse_mode: 'MarkdownV2' });
      return;
    }

    const count = validation.count!;
    const currentMsgId = ctx.message.message_id;
    let deleted = 0;
    let failed = 0;

    // Eliminar el mensaje del comando también
    const idsToDelete: number[] = [];
    for (let i = 0; i <= count; i++) {
      idsToDelete.push(currentMsgId - i);
    }

    for (const msgId of idsToDelete) {
      if (msgId <= 0) break;
      try {
        await ctx.telegram.deleteMessage(ctx.chat!.id, msgId);
        deleted++;
        // Pequeña pausa para evitar rate limiting
        await new Promise((res) => setTimeout(res, 50));
      } catch {
        failed++;
      }
    }

    // Enviar confirmación temporal
    const confirmation = await ctx.reply(
      `✅ Se eliminaron *${deleted}* mensajes\\.${failed > 0 ? ` \\(${failed} no se pudieron eliminar\\)` : ''}`,
      { parse_mode: 'MarkdownV2' }
    );

    // Auto-eliminar la confirmación después de 5 segundos
    setTimeout(async () => {
      try {
        await ctx.telegram.deleteMessage(ctx.chat!.id, confirmation.message_id);
      } catch {
        // Ignorar si ya fue eliminado
      }
    }, 5000);
  });
}
