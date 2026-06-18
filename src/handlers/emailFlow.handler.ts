import { Telegraf } from 'telegraf';
import { BotContext } from '../types/bot.types.js';
import { emailSessionService } from '../services/emailSession.service.js';
import { EmailService } from '../services/email.service.js';
import { validateEmailAddress, validateEmailSubject, validateEmailBody } from '../utils/validators.js';
import { escapeMarkdown } from '../utils/formatters.js';

const emailService = new EmailService();

export function registerEmailFlowHandler(bot: Telegraf<BotContext>): void {
    bot.on('text', async (ctx, next) => {
        const text = ctx.message.text;

        if (text.startsWith('/')) {
            return next();
        }

        const userId = ctx.from?.id;
        if (!userId) return next();

        const session = emailSessionService.getSession(userId);
        if (!session) return next();

        switch (session.step) {
            case 'awaiting_destino': {
                const validation = validateEmailAddress(text.trim());
                if (!validation.valid) {
                    await ctx.reply(validation.error ?? '⚠️ Correo inválido\\.', { parse_mode: 'MarkdownV2' });
                    return;
                }
                emailSessionService.updateSession(userId, { destino: validation.email, step: 'awaiting_asunto' });
                await ctx.reply('✅ Destino guardado\\.\n\n✏️ Ahora escribe el *asunto* del correo:', { parse_mode: 'MarkdownV2' });
                return;
            }
            case 'awaiting_asunto': {
                const validation = validateEmailSubject(text.trim());
                if (!validation.valid) {
                    await ctx.reply(validation.error ?? '⚠️ Asunto inválido\\.', { parse_mode: 'MarkdownV2' });
                    return;
                }
                emailSessionService.updateSession(userId, { asunto: validation.subject, step: 'awaiting_cuerpo' });
                await ctx.reply('✅ Asunto guardado\\.\n\n📝 Ahora escribe el *cuerpo* del correo:', { parse_mode: 'MarkdownV2' });
                return;
            }
            case 'awaiting_cuerpo': {
                const validation = validateEmailBody(text.trim());
                if (!validation.valid) {
                    await ctx.reply(validation.error ?? '⚠️ Cuerpo inválido\\.', { parse_mode: 'MarkdownV2' });
                    return;
                }

                const finalSession = emailSessionService.updateSession(userId, { cuerpo: validation.body });
                emailSessionService.endSession(userId);

                if (!finalSession?.destino || !finalSession?.asunto || !validation.body) {
                    await ctx.reply('❌ Ocurrió un error con los datos del correo\\. Intenta de nuevo con /email\\.', { parse_mode: 'MarkdownV2' });
                    return;
                }

                await ctx.reply('📤 Enviando correo\\.\\.\\.', { parse_mode: 'MarkdownV2' });

                try {
                    await emailService.sendEmail(finalSession.destino, finalSession.asunto, validation.body);
                    await ctx.reply(
                        `✅ *Correo enviado correctamente*\n` +
                        `📧 Destino: \`${escapeMarkdown(finalSession.destino)}\`\n` +
                        `📋 Asunto: \`${escapeMarkdown(finalSession.asunto)}\``,
                        { parse_mode: 'MarkdownV2' }
                    );
                } catch (error) {
                    const msg = error instanceof Error ? error.message : 'Error desconocido';
                    console.error(`[ERROR] EmailFlow: ${msg}`);
                    await ctx.reply('❌ No pude enviar el correo\\. Intenta de nuevo más tarde\\.', { parse_mode: 'MarkdownV2' });
                }
                return;
            }
            default:
                return next();
        }
    });
}