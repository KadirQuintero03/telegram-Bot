import { Telegraf } from 'telegraf';
import { BotContext } from '../types/bot.types.js';
import { FileStorageService } from '../services/fileStorage.service.js';
import { MediaCategory } from '../types/media.types.js';
import path from 'path';

const storage = new FileStorageService();

// Obtiene la URL de descarga de un archivo por su file_id
async function getFileUrl(ctx: BotContext, fileId: string): Promise<string> {
    const file = await ctx.telegram.getFile(fileId);
    const token = ctx.telegram.token;
    return `https://api.telegram.org/file/bot${token}/${file.file_path}`;
}

// Responde con el resultado de la descarga
async function handleDownload(
    ctx: BotContext,
    fileId: string,
    fileName: string,
    category: MediaCategory
): Promise<void> {
    try {
        await ctx.sendChatAction('upload_document');
        const fileUrl = await getFileUrl(ctx, fileId);
        const savedPath = await storage.downloadAndSave(fileUrl, fileName, category);

        const shortPath = path.basename(savedPath);
        await ctx.reply(
            `✅ *${getCategoryEmoji(category)} ${category}* recibido y guardado\\.\n` +
            `📄 Archivo: \`${shortPath}\``,
            { parse_mode: 'MarkdownV2' }
        );
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Error desconocido';
        console.error(`[ERROR] MediaHandler (${category}): ${msg}`);
        await ctx.reply('❌ No pude guardar el archivo\\. Intenta de nuevo\\.', {
            parse_mode: 'MarkdownV2',
        });
    }
}

function getCategoryEmoji(category: MediaCategory): string {
    const emojis: Record<MediaCategory, string> = {
        Imagenes: '🖼',
        Video: '🎬',
        Audio: '🎵',
        Documentos: '📄',
    };
    return emojis[category];
}

export function registerMediaHandlers(bot: Telegraf<BotContext>): void {
    // ── Imágenes ────────────────────────────────────────────────────
    bot.on('photo', async (ctx) => {
        // Telegram envía varias resoluciones; tomamos la de mayor calidad (última)
        const photos = ctx.message.photo;
        const photo = photos[photos.length - 1];
        if (!photo) return;

        const fileId = photo.file_id;
        const fileName = `foto_${Date.now()}.jpg`;
        await handleDownload(ctx, fileId, fileName, 'Imagenes');
    });

    // ── Videos ──────────────────────────────────────────────────────
    bot.on('video', async (ctx) => {
        const video = ctx.message.video;
        const fileName = video.file_name ?? `video_${Date.now()}.mp4`;
        await handleDownload(ctx, video.file_id, fileName, 'Video');
    });

    // ── Notas de voz (mensajes de voz grabados en Telegram) ─────────
    bot.on('voice', async (ctx) => {
        const voice = ctx.message.voice;
        const fileName = `nota_voz_${Date.now()}.ogg`;
        await handleDownload(ctx, voice.file_id, fileName, 'Audio');
    });

    // ── Audios (archivos de música enviados como audio) ─────────────
    bot.on('audio', async (ctx) => {
        const audio = ctx.message.audio;
        const fileName = audio.file_name ?? `audio_${Date.now()}.mp3`;
        await handleDownload(ctx, audio.file_id, fileName, 'Audio');
    });

    // ── Documentos (PDF, Word, ZIP, etc.) ───────────────────────────
    bot.on('document', async (ctx) => {
        const doc = ctx.message.document;
        const fileName = doc.file_name ?? `documento_${Date.now()}`;
        await handleDownload(ctx, doc.file_id, fileName, 'Documentos');
    });

    // ── Video notas (los círculos de video de Telegram) ─────────────
    bot.on('video_note', async (ctx) => {
        const note = ctx.message.video_note;
        const fileName = `video_nota_${Date.now()}.mp4`;
        await handleDownload(ctx, note.file_id, fileName, 'Video');
    });
}