import { Telegraf } from 'telegraf';
import { BotContext } from '../types/bot.types.js';
import { TikTokService } from '../services/tiktok.service.js';
import { InstagramService } from '../services/instagram.service.js';
import { YouTubeService } from '../services/youtube.service.js';
import { FileStorageService } from '../services/file-storage.service.js';
import { userRegistry } from '../services/user-registry.service.js';
import { validateDownloadUrl, SupportedPlatform, parseTikTokUrlMeta } from '../utils/validators.js';
import { commandTrigger, getCommandArgs } from '../utils/command-matcher.js';
import { deleteCommandMessage } from '../utils/telegram-helpers.js';
import { MESSAGES } from '../constants/messages.js';

const tiktokService = new TikTokService();
const instagramService = new InstagramService();
const youtubeService = new YouTubeService();
const storage = new FileStorageService();

const PLATFORM_LABELS: Record<SupportedPlatform, string> = {
  tiktok: '*Video de TikTok descargado*',
  instagram: '*Video de Instagram descargado*',
  youtube: '*Short de YouTube descargado*',
};

async function downloadByPlatform(
  platform: SupportedPlatform,
  url: string
): Promise<Buffer> {
  switch (platform) {
    case 'tiktok': return tiktokService.downloadVideo(url);
    case 'instagram': return instagramService.downloadVideo(url);
    case 'youtube': return youtubeService.downloadVideo(url);
  }
}

function buildFileName(platform: SupportedPlatform, url: string): string {
  if (platform === 'tiktok') {
    const { username, videoId } = parseTikTokUrlMeta(url);
    return `tiktok_${username}_${videoId}.mp4`;
  }
  return `${platform}_${Date.now()}.mp4`;
}

export function registerGetCommand(bot: Telegraf<BotContext>): void {
  bot.hears(commandTrigger('get'), async (ctx) => {
    const args = getCommandArgs(ctx.message.text);
    const validation = validateDownloadUrl(args);

    if (!validation.valid) {
      await ctx.reply(validation.error ?? 'Error de validación.', { parse_mode: 'Markdown' });
      await deleteCommandMessage(ctx);
      return;
    }

    const userId = ctx.from?.id;
    const userFolder = userId ? userRegistry.getFolderByTelegramId(userId) : null;

    if (!userFolder) {
      await ctx.reply(MESSAGES.NEED_REGISTER, { parse_mode: 'MarkdownV2' });
      await deleteCommandMessage(ctx);
      return;
    }

    const statusMsg = await ctx.reply(MESSAGES.GET_DOWNLOADING, { parse_mode: 'MarkdownV2' });

    const updateStatus = async (text: string): Promise<void> => {
      try {
        await ctx.telegram.editMessageText(ctx.chat!.id, statusMsg.message_id, undefined, text, {
          parse_mode: 'MarkdownV2',
        });
      } catch {}
    };

    const deleteStatus = async (): Promise<void> => {
      try {
        await ctx.telegram.deleteMessage(ctx.chat!.id, statusMsg.message_id);
      } catch {}
    };

    try {
      await ctx.sendChatAction('upload_video');

      const { url, platform } = validation as { url: string; platform: SupportedPlatform };
      const buffer = await downloadByPlatform(platform, url);
      const fileName = buildFileName(platform, url);

      await updateStatus(MESSAGES.GET_SENDING);

      const savedPath = await storage.saveBuffer(buffer, fileName, 'Video', userFolder);

      await ctx.replyWithVideo(
        { source: savedPath },
        {
          caption: PLATFORM_LABELS[platform],
          parse_mode: 'MarkdownV2',
        }
      );

      await deleteStatus();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      console.error(`[ERROR] /get: ${msg}`);
      await updateStatus(MESSAGES.GET_ERROR);
    } finally {
      await deleteCommandMessage(ctx);
    }
  });
}