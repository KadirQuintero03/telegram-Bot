import { Telegraf, Markup } from 'telegraf';
import { BotContext } from '../types/bot.types.js';
import { userRegistry } from '../services/userRegistry.service.js';
import { commandTrigger } from '../utils/commandMatcher.js';
import { deleteCommandMessage } from '../utils/telegramHelpers.js';
import { escapeMarkdown } from '../utils/formatters.js';

const PHONE_INPUT_REGEX = /^\+?[0-9\s\-()]{7,20}$/;

const PENDING_PHONE_TTL_MS = 5 * 60 * 1000;

const pendingPhoneRequests = new Map<number, number>();

function isPending(telegramId: number): boolean {
  const expiresAt = pendingPhoneRequests.get(telegramId);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    pendingPhoneRequests.delete(telegramId);
    return false;
  }
  return true;
}

function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function registerPhoneCommand(bot: Telegraf<BotContext>): void {
  bot.hears(commandTrigger('phone'), async (ctx) => {
    const telegramId = ctx.from.id;

    try {
      if (!userRegistry.isRegistered(telegramId)) {
        const username =
          ctx.from.username ??
          `${ctx.from.first_name}${ctx.from.last_name ? '_' + ctx.from.last_name : ''}`;
        userRegistry.registerUser(telegramId, username);
      }

      if (userRegistry.hasPhone(telegramId)) {
        pendingPhoneRequests.delete(telegramId);
        const phone = userRegistry.getPhone(telegramId);
        await ctx.reply(`📱 Ya tienes un número vinculado: ${escapeMarkdown(phone ?? '')}\\.`, {
          parse_mode: 'MarkdownV2',
        });
        await deleteCommandMessage(ctx);
        return;
      }

      pendingPhoneRequests.set(telegramId, Date.now() + PENDING_PHONE_TTL_MS);

      await ctx.reply(
        '📱 Para continuar necesito tu número de teléfono\\. Este se usará para vincular tu cuenta de Telegram con tu galería en GlowPic\\.\n\n' +
          'Puedes dármelo de dos formas:\n' +
          '1️⃣ Pulsando el botón *"📲 Compartir mi número de teléfono"* de abajo, si tu aplicación lo permite\\.\n' +
          '2️⃣ *Escribiendo tú mismo tu número* en el campo de texto de este chat y enviándolo como un mensaje normal \\(ej\\. \\`+57 300 1234567\\`\\)\\.\n\n' +
          'También puedes escribir /cancelar si no deseas continuar\\.',
        {
          parse_mode: 'MarkdownV2',
          reply_markup: Markup.keyboard([
            Markup.button.contactRequest('📲 Compartir mi número de teléfono'),
          ])
            .oneTime()
            .resize().reply_markup,
        }
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      console.error(`[ERROR] /phone: ${msg}`);
      await ctx.reply(`❌ Ocurrió un problema al procesar /phone\\.\n${escapeMarkdown(msg)}`, {
        parse_mode: 'MarkdownV2',
      });
    } finally {
      await deleteCommandMessage(ctx);
    }
  });

  async function saveAndConfirm(
    ctx: BotContext,
    telegramId: number,
    rawPhone: string
  ): Promise<void> {
    try {
      if (!userRegistry.isRegistered(telegramId)) {
        const username =
          ctx.from?.username ??
          `${ctx.from?.first_name ?? 'usuario'}${ctx.from?.last_name ? '_' + ctx.from.last_name : ''}`;
        userRegistry.registerUser(telegramId, username);
      }

      userRegistry.savePhone(telegramId, rawPhone);
      pendingPhoneRequests.delete(telegramId);

      await ctx.reply(
        '✅ ¡Listo! Tu número quedó vinculado a tu cuenta\\.\n\n' +
          'Ahora puedes usar ese mismo número para iniciar sesión en GlowPic\\. Usa /web para obtener tu enlace\\.',
        { parse_mode: 'MarkdownV2', reply_markup: { remove_keyboard: true } }
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      console.error(`[ERROR] Guardando teléfono (/phone): ${msg}`);
      pendingPhoneRequests.set(telegramId, Date.now() + PENDING_PHONE_TTL_MS);
      await ctx.reply(
        `❌ No pude guardar tu número de teléfono\\. ${escapeMarkdown(msg)}\n\nPuedes intentarlo de nuevo escribiendo tu número o pulsando el botón\\.`,
        { parse_mode: 'MarkdownV2' }
      );
    }
  }

  bot.on('contact', async (ctx) => {
    const telegramId = ctx.from.id;
    const contact = ctx.message && 'contact' in ctx.message ? ctx.message.contact : undefined;

    if (!contact) return;

    if (contact.user_id && contact.user_id !== telegramId) {
      await ctx.reply(
        '⚠️ Debes compartir *tu propio* número de teléfono, no el de otra persona\\.',
        { parse_mode: 'MarkdownV2', reply_markup: { remove_keyboard: true } }
      );
      return;
    }

    await saveAndConfirm(ctx, telegramId, contact.phone_number);
  });

  bot.on('text', async (ctx, next) => {
    const telegramId = ctx.from.id;
    const text = ctx.message.text.trim();

    if (text.startsWith('/')) {
      if (text.toLowerCase().startsWith('/cancelar') && isPending(telegramId)) {
        pendingPhoneRequests.delete(telegramId);
        await ctx.reply('Operación cancelada. Puedes volver a intentarlo con /phone cuando quieras.', {
          reply_markup: { remove_keyboard: true },
        });
        return;
      }
      return next();
    }

    if (!isPending(telegramId)) {
      return next();
    }

    if (!PHONE_INPUT_REGEX.test(text) || digitsOnly(text).length < 7) {
      await ctx.reply(
        '⚠️ Ese no parece un número de teléfono válido\\. Escribe solo dígitos, con o sin \\+código de país \\(ej\\. \\`+57 300 1234567\\`\\), o usa el botón para compartir tu contacto\\.',
        { parse_mode: 'MarkdownV2' }
      );
      return;
    }

    await saveAndConfirm(ctx, telegramId, text);
  });
}
