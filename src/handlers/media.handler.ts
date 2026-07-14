import { Telegraf } from 'telegraf';
import { BotContext } from '../types/bot.types.js';
import { FileStorageService } from '../services/fileStorage.service.js';
import { userRegistry } from '../services/userRegistry.service.js';
import { MediaCategory } from '../types/media.types.js';
import { cloudSessionService } from '../services/cloudSession.service.js';

const storage = new FileStorageService();

async function getFileUrl(ctx: BotContext, fileId: string): Promise<string> {
    const file = await ctx.telegram.getFile(fileId);
    const token = ctx.telegram.token;
    return `https://api.telegram.org/file/bot${token}/${file.file_path}`;
}

// ── NUEVO: resuelve la carpeta del usuario o avisa que debe registrarse ──
async function resolveUserFolder(ctx: BotContext): Promise<string | null> {
    const userId = ctx.from?.id;
    if (!userId) return null;

    const folder = userRegistry.getFolderByTelegramId(userId);

    if (!folder) {
        await ctx.reply(
            '⚠️ Primero escribe /start para registrarte\\.',
            { parse_mode: 'MarkdownV2' }
        );
        return null;
    }

    return folder;
}

// Reacciona al mensaje original que trajo el archivo (foto, video, doc, etc.)
// en vez de enviar un mensaje nuevo. Evita el spam cuando se suben muchos archivos.
// Telegram solo permite reaccionar con un set fijo de emojis (no acepta ✅/✖️ libremente).
// Usamos los más cercanos disponibles: 👍 para éxito, 👎 para error.
async function reactToMessage(ctx: BotContext, emoji: '👍' | '👎'): Promise<void> {
    const chatId = ctx.chat?.id;
    const messageId = ctx.message?.message_id;
    if (!chatId || !messageId) return;

    try {
        await ctx.telegram.setMessageReaction(chatId, messageId, [
            { type: 'emoji', emoji },
        ]);
    } catch (reactionError) {
        // Si la reacción falla (ej: bot sin permisos), no interrumpe el flujo,
        // pero queda registrado en consola para depurar.
        const msg = reactionError instanceof Error ? reactionError.message : 'Error desconocido';
        console.error(`[WARN] No se pudo reaccionar al mensaje ${messageId}: ${msg}`);
    }
}

async function handleDownload(
    ctx: BotContext,
    fileId: string,
    fileName: string,
    category: MediaCategory
): Promise<void> {
    const userFolder = await resolveUserFolder(ctx);
    if (!userFolder) return;

    const userId = ctx.from!.id;
    const checkDuplicates = cloudSessionService.hasUsedCloud(userId);

    try {
        await ctx.sendChatAction('upload_document');
        const fileUrl = await getFileUrl(ctx, fileId);
        const savedPath = await storage.downloadAndSave(fileUrl, fileName, category, userFolder, checkDuplicates);

        // El detalle completo solo queda en consola; el chat solo recibe la reacción ✅
        console.info(`[MediaHandler] Archivo guardado con éxito (${category}): ${savedPath}`);
        await reactToMessage(ctx, '👍');
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Error desconocido';
        // El detalle completo solo queda en consola; el chat solo recibe la reacción 👎
        console.error(`[ERROR] No se pudo guardar debido a un error. MediaHandler (${category}): ${msg}`);
        await reactToMessage(ctx, '👎');
    }
}

export function registerMediaHandlers(bot: Telegraf<BotContext>): void {
    bot.on('photo', async (ctx) => {
        const photos = ctx.message.photo;
        const photo = photos[photos.length - 1];
        if (!photo) return;
        await handleDownload(ctx, photo.file_id, `foto_${Date.now()}.jpg`, 'Imagenes');
    });

    bot.on('video', async (ctx) => {
        const video = ctx.message.video;
        await handleDownload(ctx, video.file_id, video.file_name ?? `video_${Date.now()}.mp4`, 'Video');
    });

    bot.on('voice', async (ctx) => {
        await handleDownload(ctx, ctx.message.voice.file_id, `nota_voz_${Date.now()}.ogg`, 'Audio');
    });

    bot.on('audio', async (ctx) => {
        const audio = ctx.message.audio;
        await handleDownload(ctx, audio.file_id, audio.file_name ?? `audio_${Date.now()}.mp3`, 'Audio');
    });

    bot.on('document', async (ctx) => {
        const doc = ctx.message.document;
        await handleDownload(ctx, doc.file_id, doc.file_name ?? `documento_${Date.now()}`, 'Documentos');
    });

    bot.on('video_note', async (ctx) => {
        await handleDownload(ctx, ctx.message.video_note.file_id, `video_nota_${Date.now()}.mp4`, 'Video');
    });
}