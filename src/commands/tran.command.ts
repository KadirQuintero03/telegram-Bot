import { Telegraf } from 'telegraf';
import { BotContext } from '../types/bot.types.js';
import { GeminiService } from '../services/gemini.service.js';
import { commandTrigger } from '../utils/commandMatcher.js';
import { deleteCommandMessage, downloadTelegramFile } from '../utils/telegramHelpers.js';
import { escapeMarkdown } from '../utils/formatters.js';

const geminiService = new GeminiService();

const TRANSCRIBE_INSTRUCTION =
  'Transcribe fielmente el audio adjunto. Responde ÚNICAMENTE con la transcripción literal '+
  'del audio, en el idioma en que fue hablado, sin agregar comentarios, títulos ni texto adicional. '+
  'Si no logras entender ninguna parte del audio, responde exactamente: "NO_SE_ENTIENDE".';

interface AudioRef {
  fileId: string;
  mimeType: string;
  fileName: string;
}

function resolveAudio(ctx: BotContext): AudioRef | null {
  const replyTo = ctx.message && 'reply_to_message' in ctx.message ? ctx.message.reply_to_message : undefined;
  if (!replyTo) return null;

  if ('voice' in replyTo && replyTo.voice) {
    return {
      fileId: replyTo.voice.file_id,
      mimeType: replyTo.voice.mime_type ?? 'audio/ogg',
      fileName: `nota_voz_${replyTo.voice.file_unique_id}.ogg`,
    };
  }

  if ('audio' in replyTo && replyTo.audio) {
    return {
      fileId: replyTo.audio.file_id,
      mimeType: replyTo.audio.mime_type ?? 'audio/mpeg',
      fileName: replyTo.audio.file_name ?? `audio_${replyTo.audio.file_unique_id}.mp3`,
    };
  }

  return null;
}

export function registerTranCommand(bot: Telegraf<BotContext>): void {
  bot.hears(commandTrigger('tran'), async (ctx) => {
    const audio = resolveAudio(ctx);

    if (!audio) {
      await ctx.reply(
        'Debes *responder* a una nota de voz o a un audio con `/tran` para transcribirlo\\.',
        { parse_mode: 'MarkdownV2' }
      );
      await deleteCommandMessage(ctx);
      return;
    }

    try {
      await ctx.sendChatAction('typing');

      const file = await downloadTelegramFile(ctx, audio.fileId, audio.mimeType, audio.fileName);

      const transcription = await geminiService.generateFromMedia(
        file.buffer,
        audio.mimeType,
        TRANSCRIBE_INSTRUCTION
      );

      if (transcription.trim() === 'NO_SE_ENTIENDE') {
        await ctx.reply('No logré entender el audio con claridad\\. Intenta con uno más claro\\.', {
          parse_mode: 'MarkdownV2',
        });
        return;
      }

      await ctx.reply(
        `*Transcripción del audio*\n\n${escapeMarkdown(transcription)}`,
        { parse_mode: 'MarkdownV2' }
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      console.error(`[ERROR] /tran: ${msg}`);
      await ctx.reply(`No pude transcribir el audio\\.\n${escapeMarkdown(msg)}`, {
        parse_mode: 'MarkdownV2',
      });
    } finally {
      await deleteCommandMessage(ctx);
    }
  });
}
