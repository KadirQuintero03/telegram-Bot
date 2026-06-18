import { Telegraf } from 'telegraf';
import { BotContext } from '../types/bot.types.js';
import { TikTokService } from '../services/tiktok.service.js';
import { FileStorageService } from '../services/fileStorage.service.js';
import { userRegistry } from '../services/userRegistry.service.js';
import { validateTikTokUrl, parseTikTokUrlMeta } from '../utils/validators.js';
import { escapeMarkdown } from '../utils/formatters.js';

const tiktokService = new TikTokService();
const storage = new FileStorageService();

const DOWNLOADING_TEXT = '⏳ Descargando video\\.\\.\\.';
const SENDING_TEXT = '📤 Enviando video\\.\\.\\.';

export function registerGetCommand(bot: Telegraf<BotContext>): void {
    bot.command('get', async (ctx) => {
        const args = ctx.message.text.split(' ').slice(1).join(' ');
        const validation = validateTikTokUrl(args);

        if (!validation.valid) {
            await ctx.reply(validation.error ?? 'Error de validación.', { parse_mode: 'Markdown' });
            return;
        }

        const userId = ctx.from?.id;
        const userFolder = userId ? userRegistry.getFolderByTelegramId(userId) : null;

        if (!userFolder) {
            await ctx.reply('⚠️ Primero escribe /start para registrarte\\.', { parse_mode: 'MarkdownV2' });
            return;
        }

        // Mensaje de estado: "Descargando" → "Enviando" → se borra al terminar
        // (o se reemplaza por el error si algo falla).
        const statusMsg = await ctx.reply(DOWNLOADING_TEXT, { parse_mode: 'MarkdownV2' });

        const updateStatus = async (text: string): Promise<void> => {
            try {
                await ctx.telegram.editMessageText(ctx.chat!.id, statusMsg.message_id, undefined, text, {
                    parse_mode: 'MarkdownV2',
                });
            } catch {
                // El mensaje pudo haber sido borrado manualmente; no es crítico.
            }
        };

        const deleteStatus = async (): Promise<void> => {
            try {
                await ctx.telegram.deleteMessage(ctx.chat!.id, statusMsg.message_id);
            } catch {
                // Ya estaba eliminado; ignorar.
            }
        };

        try {
            await ctx.sendChatAction('upload_video');
            const buffer = await tiktokService.downloadVideo(validation.url!);

            await updateStatus(SENDING_TEXT);

            const { username, videoId } = parseTikTokUrlMeta(validation.url!);
            const fileName = `tiktok_${username}_${videoId}.mp4`;
            const savedPath = await storage.saveBuffer(buffer, fileName, 'Video', userFolder);

            await ctx.replyWithVideo(
                { source: savedPath },
                {
                    caption: `🎬 *Video de TikTok descargado*\n👤 Autor: *${escapeMarkdown(username)}*`,
                    parse_mode: 'MarkdownV2',
                }
            );

            await deleteStatus();
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Error desconocido';
            console.error(`[ERROR] /get: ${msg}`);
            await updateStatus(`❌ No pude completar la descarga del video\\.\n${escapeMarkdown(msg)}`);
        }
    });
}