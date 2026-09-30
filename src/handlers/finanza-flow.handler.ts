import { Telegraf } from 'telegraf';
import { BotContext } from '../types/bot.types.js';
import { finanzaSessionService } from '../services/finanza-session.service.js';
import { finanzasService } from '../services/finanzas.service.js';
import { downloadTelegramFile, safeReply } from '../utils/telegram-helpers.js';
import { escapeMarkdown } from '../utils/formatters.js';
import { escapeCop } from '../utils/finanzas.js';
import { MESSAGES } from '../constants/messages.js';

export function registerFinanzaFlowHandler(bot: Telegraf<BotContext>): void {
  // Manejo de mensajes de texto para registros de Gasto / Ingreso
  bot.on('text', async (ctx, next) => {
    const text = ctx.message.text;
    if (text.startsWith('/')) return next();

    const userId = ctx.from?.id;
    if (!userId) return next();

    const step = finanzaSessionService.getStep(userId);
    if (step !== 'awaiting_gasto_text' && step !== 'awaiting_ingreso_text') {
      return next();
    }

    const defaultType = step === 'awaiting_gasto_text' ? 'gasto' : 'ingreso';
    const chatId = ctx.chat?.id ?? userId;
    const username =
      ctx.from.username ??
      `${ctx.from.first_name}${ctx.from.last_name ? '_' + ctx.from.last_name : ''}`;

    try {
      await ctx.sendChatAction('typing');
      const result = await finanzasService.registerTextTransaction(
        userId,
        chatId,
        username,
        text,
        defaultType
      );

      finanzaSessionService.clearSession(userId);

      if (!result) {
        await ctx.reply(MESSAGES.FINANZA_PARSE_ERROR, { parse_mode: 'Markdown' });
        return;
      }

      const { transaction: tx, profile } = result;
      const tipoIcon = tx.tipo === 'ingreso' ? '🟢 Ingreso' : '🔴 Gasto';

      const replyMsg =
        `*Transacción registrada correctamente*\n\n` +
        `• Tipo: *${tipoIcon}*\n` +
        `• Monto: *$${escapeCop(tx.monto)} COP*\n` +
        `• Categoría: *${escapeMarkdown(tx.categoria)}*\n` +
        `• Descripción: ${escapeMarkdown(tx.descripcion)}\n` +
        `• Fecha: *${escapeMarkdown(tx.fecha)}*\n\n` +
        `💰 *Nuevo saldo actual:* *$${escapeCop(profile.balance)} COP*`;

      await safeReply(ctx, replyMsg);
      return;
    } catch (error) {
      finanzaSessionService.clearSession(userId);
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      console.error(`[ERROR] FinanzaFlow (text): ${msg}`);
      await ctx.reply(MESSAGES.FINANZA_ERROR, { parse_mode: 'MarkdownV2' });
      return;
    }
  });

  // Manejo de notas de voz / audios para Registro por voz
  const handleVoiceInput = async (ctx: BotContext, fileId: string, mimeType: string, fileName: string) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const step = finanzaSessionService.getStep(userId);
    if (step !== 'awaiting_voice') return;

    const chatId = ctx.chat?.id ?? userId;
    const username =
      ctx.from.username ??
      `${ctx.from.first_name}${ctx.from.last_name ? '_' + ctx.from.last_name : ''}`;

    try {
      await ctx.sendChatAction('typing');

      const fileData = await downloadTelegramFile(ctx, fileId, mimeType, fileName);
      const result = await finanzasService.registerVoiceTransaction(
        userId,
        chatId,
        username,
        fileData.buffer,
        fileData.mimeType
      );

      finanzaSessionService.clearSession(userId);

      if (!result) {
        await ctx.reply(MESSAGES.FINANZA_VOICE_ERROR, { parse_mode: 'MarkdownV2' });
        return;
      }

      const { transaction: tx, profile } = result;
      const tipoIcon = tx.tipo === 'ingreso' ? '🟢 Ingreso' : '🔴 Gasto';

      const replyMsg =
        `🎙️ *Finanza registrada por voz*\n\n` +
        `• Tipo: *${tipoIcon}*\n` +
        `• Monto: *$${escapeCop(tx.monto)} COP*\n` +
        `• Categoría: *${escapeMarkdown(tx.categoria)}*\n` +
        `• Descripción: ${escapeMarkdown(tx.descripcion)}\n` +
        `• Fecha: *${escapeMarkdown(tx.fecha)}*\n\n` +
        `💰 *Nuevo saldo actual:* *$${escapeCop(profile.balance)} COP*`;

      await safeReply(ctx, replyMsg);
    } catch (error) {
      finanzaSessionService.clearSession(userId);
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      console.error(`[ERROR] FinanzaFlow (voice): ${msg}`);
      await ctx.reply(MESSAGES.FINANZA_ERROR, { parse_mode: 'MarkdownV2' });
    }
  };

  bot.on('voice', async (ctx) => {
    const voice = ctx.message.voice;
    await handleVoiceInput(ctx, voice.file_id, voice.mime_type ?? 'audio/ogg', `voice_${Date.now()}.ogg`);
  });

  bot.on('audio', async (ctx) => {
    const audio = ctx.message.audio;
    await handleVoiceInput(ctx, audio.file_id, audio.mime_type ?? 'audio/mpeg', audio.file_name ?? `audio_${Date.now()}.mp3`);
  });
}
