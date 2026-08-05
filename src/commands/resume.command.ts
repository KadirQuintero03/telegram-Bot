import { Telegraf } from 'telegraf';
import { BotContext } from '../types/bot.types.js';
import { GeminiService } from '../services/gemini.service.js';
import { commandTrigger } from '../utils/commandMatcher.js';
import { deleteCommandMessage, downloadTelegramFile } from '../utils/telegramHelpers.js';
import { escapeMarkdown } from '../utils/formatters.js';

const geminiService = new GeminiService();

const SUMMARY_INSTRUCTION =
  'Resume brevemente el contenido adjunto (o el texto, si es texto) en español. ' +
  'El resumen debe tener como máximo 4-5 líneas, yendo directo a las ideas principales, ' +
  'sin agregar opiniones ni información que no esté presente en el contenido original.';

// Límite prudente para no exceder el tamaño razonable de una solicitud inline a Gemini.
const MAX_MEDIA_BYTES = 18 * 1024 * 1024;

type ResumenTarget =
  | { kind: 'text'; text: string }
  | { kind: 'media'; fileId: string; mimeType: string; fileName: string };

function resolveTarget(ctx: BotContext): ResumenTarget | null {
  const replyTo = ctx.message && 'reply_to_message' in ctx.message ? ctx.message.reply_to_message : undefined;
  if (!replyTo) return null;

  if ('text' in replyTo && replyTo.text) {
    return { kind: 'text', text: replyTo.text };
  }

  if ('voice' in replyTo && replyTo.voice) {
    return {
      kind: 'media',
      fileId: replyTo.voice.file_id,
      mimeType: replyTo.voice.mime_type ?? 'audio/ogg',
      fileName: `nota_voz_${replyTo.voice.file_unique_id}.ogg`,
    };
  }

  if ('audio' in replyTo && replyTo.audio) {
    return {
      kind: 'media',
      fileId: replyTo.audio.file_id,
      mimeType: replyTo.audio.mime_type ?? 'audio/mpeg',
      fileName: replyTo.audio.file_name ?? `audio_${replyTo.audio.file_unique_id}.mp3`,
    };
  }

  if ('photo' in replyTo && replyTo.photo && replyTo.photo.length > 0) {
    const largest = replyTo.photo[replyTo.photo.length - 1]!;
    return {
      kind: 'media',
      fileId: largest.file_id,
      mimeType: 'image/jpeg',
      fileName: `foto_${largest.file_unique_id}.jpg`,
    };
  }

  if ('video' in replyTo && replyTo.video) {
    return {
      kind: 'media',
      fileId: replyTo.video.file_id,
      mimeType: replyTo.video.mime_type ?? 'video/mp4',
      fileName: replyTo.video.file_name ?? `video_${replyTo.video.file_unique_id}.mp4`,
    };
  }

  if ('document' in replyTo && replyTo.document) {
    return {
      kind: 'media',
      fileId: replyTo.document.file_id,
      mimeType: replyTo.document.mime_type ?? 'application/octet-stream',
      fileName: replyTo.document.file_name ?? `documento_${replyTo.document.file_unique_id}`,
    };
  }

  // Mensaje respondido sin texto, caption o adjunto: si tiene caption, usarlo.
  if ('caption' in replyTo && replyTo.caption) {
    return { kind: 'text', text: replyTo.caption };
  }

  return null;
}

export function registerResumeCommand(bot: Telegraf<BotContext>): void {
  bot.hears(commandTrigger('resume'), async (ctx) => {
    const target = resolveTarget(ctx);

    if (!target) {
      await ctx.reply(
        '⚠️ Debes *responder* a un mensaje con texto, audio, imagen, video o documento con `/resume`\\.',
        { parse_mode: 'MarkdownV2' }
      );
      await deleteCommandMessage(ctx);
      return;
    }

    try {
      await ctx.sendChatAction('typing');

      let summary: string;

      if (target.kind === 'text') {
        summary = await geminiService.generateText(`${SUMMARY_INSTRUCTION}\n\nTexto:\n${target.text}`);
      } else {
        const file = await downloadTelegramFile(ctx, target.fileId, target.mimeType, target.fileName);

        if (file.buffer.byteLength > MAX_MEDIA_BYTES) {
          await ctx.reply('⚠️ El archivo es demasiado pesado para poder resumirlo\\.', {
            parse_mode: 'MarkdownV2',
          });
          return;
        }

        summary = await geminiService.generateFromMedia(file.buffer, target.mimeType, SUMMARY_INSTRUCTION);
      }

      await ctx.reply(`📝 *Resumen*\n\n${escapeMarkdown(summary)}`, { parse_mode: 'MarkdownV2' });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      console.error(`[ERROR] /resume: ${msg}`);
      await ctx.reply(`❌ No pude generar el resumen\\.\n${escapeMarkdown(msg)}`, {
        parse_mode: 'MarkdownV2',
      });
    } finally {
      await deleteCommandMessage(ctx);
    }
  });
}
