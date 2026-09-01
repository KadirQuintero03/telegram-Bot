import { Telegraf, Markup } from 'telegraf';
import { BotContext } from '../types/bot.types.js';
import { userRegistry } from '../services/userRegistry.service.js';
import { cloudSessionService } from '../services/cloudSession.service.js';
import { fileBrowserService, FILE_PAGE_SIZE, CloudFileInfo } from '../services/fileBrowser.service.js';
import { MediaCategory } from '../types/media.types.js';
import { escapeMarkdown } from '../utils/formatters.js';
import { commandTrigger } from '../utils/commandMatcher.js';
import { deleteCommandMessage } from '../utils/telegramHelpers.js';

const CATEGORY_LABELS: Record<MediaCategory, string> = {
    Imagenes: 'Imágenes',
    Video: 'Videos',
    Audio: 'Audios',
    Documentos: 'Documentos',
};

const VALID_CATEGORIES: MediaCategory[] = ['Imagenes', 'Video', 'Audio', 'Documentos'];

function resolveUserFolder(userId: number | undefined): string | null {
    if (!userId) return null;
    return userRegistry.getFolderByTelegramId(userId);
}

function buildMenuKeyboard() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback(CATEGORY_LABELS.Imagenes, 'cloud:cat:Imagenes'),
            Markup.button.callback(CATEGORY_LABELS.Video, 'cloud:cat:Video'),
        ],
        [
            Markup.button.callback(CATEGORY_LABELS.Audio, 'cloud:cat:Audio'),
            Markup.button.callback(CATEGORY_LABELS.Documentos, 'cloud:cat:Documentos'),
        ],
    ]);
}

function buildPageKeyboard(hasNext: boolean) {
    const rows = [
        [
            Markup.button.callback('Todos', 'cloud:all'),
            Markup.button.callback('Rango', 'cloud:specific'),
            Markup.button.callback('1⃣ Único', 'cloud:unique'),
        ],
    ];
    if (hasNext) {
        rows.push([Markup.button.callback('Siguiente', 'cloud:next')]);
    }
    return Markup.inlineKeyboard(rows);
}

function buildPageMessage(
    category: MediaCategory,
    allFiles: CloudFileInfo[],
    page: CloudFileInfo[],
    offset: number
): string {
    const totalSize = escapeMarkdown(fileBrowserService.getTotalSizeFormatted(allFiles));
    const listText = page
        .map((f, i) => `*${offset + i + 1}\\.* \`${escapeMarkdown(f.name)}\``)
        .join('\n');

    return (
        `${CATEGORY_LABELS[category]}\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `Total de archivos: *${allFiles.length}*\n` +
        `Espacio ocupado: *${totalSize}*\n\n` +
        `Mostrando archivos *${offset + 1}* a *${offset + page.length}*:\n${listText}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `*Todos* — envía estos ${page.length} archivos al chat\\.\n` +
        `*Rango* — indica un rango \\(ej\\. 2\\-5\\) para enviar\\.\n` +
        `1⃣ *Único* — indica un solo número para enviar ese archivo\\.\n` +
        `*Siguiente* — muestra los próximos archivos\\.`
    );
}

export async function sendFiles(ctx: BotContext, filePaths: string[]): Promise<void> {
    let failedCount = 0;

    for (const filePath of filePaths) {
        try {
            await ctx.sendChatAction('upload_document');
            await ctx.replyWithDocument({ source: filePath });
        } catch (error) {
            failedCount++;
            const msg = error instanceof Error ? error.message : 'Error desconocido';
            console.error(`[ERROR] /cloud sendFiles (${filePath}): ${msg}`);
        }
    }

    if (failedCount > 0) {
        await ctx.reply(
            `No se pudieron enviar *${failedCount}* de los *${filePaths.length}* archivos\\. Revisa los logs del bot\\.`,
            { parse_mode: 'MarkdownV2' }
        );
    }
}

export function registerCloudCommand(bot: Telegraf<BotContext>): void {
    bot.hears(commandTrigger('cloud'), async (ctx) => {
        const userId = ctx.from?.id;
        const userFolder = resolveUserFolder(userId);

        if (!userId || !userFolder) {
            await ctx.reply('Primero escribe /start para registrarte\\.', { parse_mode: 'MarkdownV2' });
            await deleteCommandMessage(ctx);
            return;
        }

        cloudSessionService.markCloudUsed(userId);
        cloudSessionService.resetSession(userId);

        await ctx.reply(
            '*Tus archivos en la nube*\n\n¿A cuál de tus directorios personales deseas acceder?',
            { parse_mode: 'MarkdownV2', reply_markup: buildMenuKeyboard().reply_markup }
        );


        await deleteCommandMessage(ctx);
    });

    bot.action(/^cloud:cat:(.+)$/, async (ctx) => {
        await ctx.answerCbQuery();
        const userId = ctx.from?.id;
        const userFolder = resolveUserFolder(userId);
        if (!userId || !userFolder) return;

        const category = ctx.match[1] as MediaCategory;
        if (!VALID_CATEGORIES.includes(category)) return;

        const allFiles = fileBrowserService.listFiles(userFolder, category);

        if (allFiles.length === 0) {
            await ctx.reply(`No tienes archivos guardados en *${CATEGORY_LABELS[category]}*\\.`, {
                parse_mode: 'MarkdownV2',
            });
            return;
        }

        const { page, hasNext } = fileBrowserService.getPage(allFiles, 0);
        cloudSessionService.updateSession(userId, {
            category,
            userFolder,
            offset: 0,
            pageFiles: page.map((f) => f.fullPath),
            step: null,
        });

        await ctx.reply(buildPageMessage(category, allFiles, page, 0), {
            parse_mode: 'MarkdownV2',
            reply_markup: buildPageKeyboard(hasNext).reply_markup,
        });
    });

    bot.action('cloud:next', async (ctx) => {
        await ctx.answerCbQuery();
        const userId = ctx.from?.id;
        if (!userId) return;

        const session = cloudSessionService.getSession(userId);
        if (!session.category || !session.userFolder) return;

        const allFiles = fileBrowserService.listFiles(session.userFolder, session.category);
        const nextOffset = session.offset + FILE_PAGE_SIZE;

        if (nextOffset >= allFiles.length) {
            await ctx.reply('No hay más archivos para mostrar\\.', { parse_mode: 'MarkdownV2' });
            return;
        }

        const { page, hasNext } = fileBrowserService.getPage(allFiles, nextOffset);
        cloudSessionService.updateSession(userId, {
            offset: nextOffset,
            pageFiles: page.map((f) => f.fullPath),
            step: null,
        });

        await ctx.reply(buildPageMessage(session.category, allFiles, page, nextOffset), {
            parse_mode: 'MarkdownV2',
            reply_markup: buildPageKeyboard(hasNext).reply_markup,
        });
    });

    bot.action('cloud:all', async (ctx) => {
        await ctx.answerCbQuery();
        const userId = ctx.from?.id;
        if (!userId) return;

        const session = cloudSessionService.getSession(userId);
        if (session.pageFiles.length === 0) return;

        await sendFiles(ctx, session.pageFiles);
    });

    bot.action('cloud:specific', async (ctx) => {
        await ctx.answerCbQuery();
        const userId = ctx.from?.id;
        if (!userId) return;

        cloudSessionService.updateSession(userId, { step: 'awaiting_specific_range' });
        await ctx.reply(
            'Escribe el rango de archivos que deseas recibir\\.\n' +
            'Usa el formato `N-M`, por ejemplo: `2-5`\\.',
            { parse_mode: 'MarkdownV2' }
        );
    });

    bot.action('cloud:unique', async (ctx) => {
        await ctx.answerCbQuery();
        const userId = ctx.from?.id;
        if (!userId) return;

        cloudSessionService.updateSession(userId, { step: 'awaiting_unique_number' });
        await ctx.reply('1⃣ Escribe el número del archivo específico que deseas recibir\\.', {
            parse_mode: 'MarkdownV2',
        });
    });
}