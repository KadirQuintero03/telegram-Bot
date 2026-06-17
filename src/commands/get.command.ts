import { Telegraf } from 'telegraf';
import { BotContext } from '../types/bot.types.js';
import { TikTokService } from '../services/tiktok.service.js';
import { FileStorageService } from '../services/fileStorage.service.js';
import { userRegistry } from '../services/userRegistry.service.js';
import { validateTikTokUrl } from '../utils/validators.js';
import { escapeMarkdown } from '../utils/formatters.js';

const tiktokService = new TikTokService();
const storage = new FileStorageService();

export function registerGetCommand(bot: Telegraf<BotContext>): void {
    bot.command('get', async (ctx) => {
        const args = ctx.message.text.split(' ').slice(1).join(' ');
        const validation = validateTikTokUrl(args);

        if (!validation.valid) {
            await ctx.reply(validation.error ?? 'Error de validación.', { parse_mode: 'Markdown' });
            return;
        }

        // ── Mismo patrón de registro que usa media.handler.ts ──
        const userId = ctx.from?.id;
        const userFolder = userId ? userRegistry.getFolderByTelegramId(userId) : null;

        if (!userFolder) {
            await ctx.reply('⚠️ Primero escribe /start para registrarte\\.', { parse_mode: 'MarkdownV2' });
            return;
        }

        try {
            await ctx.sendChatAction('typing');
            const info = await tiktokService.getVideoInfo(validation.url!);

            await ctx.sendChatAction('upload_video');
            const buffer = await tiktokService.downloadVideoBuffer(info.downloadUrl);

            const fileName = `tiktok_${info.author}_${info.id}.mp4`;
            const savedPath = await storage.saveBuffer(buffer, fileName, 'Video', userFolder);

            const captionLines = [
                '🎬 *Video de TikTok descargado sin marca de agua*',
                `👤 Autor: *${escapeMarkdown(info.author)}*`,
            ];
            if (info.description) {
                captionLines.push(`📝 ${escapeMarkdown(info.description.slice(0, 200))}`);
            }

            await ctx.replyWithVideo(
                { source: savedPath },
                { caption: captionLines.join('\n'), parse_mode: 'MarkdownV2' }
            );
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Error desconocido';
            console.error(`[ERROR] /get: ${msg}`);
            await ctx.reply(`❌ No pude descargar el video\\. ${escapeMarkdown(msg)}`, {
                parse_mode: 'MarkdownV2',
            });
        }
    });
}