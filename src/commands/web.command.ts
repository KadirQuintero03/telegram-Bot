import { Telegraf, Markup } from 'telegraf';
import { BotContext } from '../types/bot.types.js';
import { userRegistry } from '../services/userRegistry.service.js';
import { commandTrigger } from '../utils/commandMatcher.js';
import { deleteCommandMessage } from '../utils/telegramHelpers.js';
import { escapeMarkdown } from '../utils/formatters.js';

// Enlace que se comparte cuando el usuario ya tiene su teléfono vinculado.
// (De momento apunta aquí; a futuro puede reemplazarse por la URL real de GlowPic).
const WEB_LINK = 'https://www.instagram.com/';

// Formato aceptado para un teléfono escrito a mano (permite espacios,
// guiones y paréntesis; se limpia antes de validar la cantidad de dígitos).
const PHONE_INPUT_REGEX = /^\+?[0-9\s\-()]{7,20}$/;

// Cuánto tiempo esperamos a que el usuario responda con su número antes de
// dejar de interpretar sus próximos mensajes de texto como un teléfono.
const PENDING_PHONE_TTL_MS = 5 * 60 * 1000; // 5 minutos

// Usuarios a los que les pedimos el teléfono y aún no han respondido.
// Es SOLO en memoria a propósito: si el proceso se reinicia, simplemente se
// les vuelve a pedir con /web; no es información sensible ni persistente.
const pendingPhoneRequests = new Map<number, number>(); // telegramId -> expira en (ms)

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

export function registerWebCommand(bot: Telegraf<BotContext>): void {
  bot.hears(commandTrigger('web'), async (ctx) => {
    const telegramId = ctx.from.id;

    try {
      // Nos aseguramos de que el usuario exista en el registro (por si usa
      // /web sin haber usado /start antes).
      if (!userRegistry.isRegistered(telegramId)) {
        const username =
          ctx.from.username ??
          `${ctx.from.first_name}${ctx.from.last_name ? '_' + ctx.from.last_name : ''}`;
        userRegistry.registerUser(telegramId, username);
      }

      if (userRegistry.hasPhone(telegramId)) {
        // Ya tiene teléfono guardado: solo le enviamos el enlace.
        pendingPhoneRequests.delete(telegramId);
        await ctx.reply(`🌐 Aquí tienes tu enlace:\n${WEB_LINK}`);
        await deleteCommandMessage(ctx);
        return;
      }

      // No tiene teléfono guardado: se lo pedimos formalmente, ofreciendo
      // dos formas de dárnoslo:
      //  1) Pulsando el botón para compartir su contacto de Telegram, o
      //  2) Escribiendo el número directamente en el campo de texto del
      //     chat y enviándolo como un mensaje normal.
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
      console.error(`[ERROR] /web: ${msg}`);
      await ctx.reply(`❌ Ocurrió un problema al procesar /web\\.\n${escapeMarkdown(msg)}`, {
        parse_mode: 'MarkdownV2',
      });
    } finally {
      await deleteCommandMessage(ctx);
    }
  });

  // Guarda el número (venga de un "contact" de Telegram o de texto escrito
  // a mano) y responde de forma consistente en ambos casos. Cualquier error
  // se captura y se informa al usuario SIN dejar que la excepción se
  // propague fuera del handler (lo que podría tumbar el proceso).
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
          `Ahora puedes usar ese mismo número para iniciar sesión en GlowPic\\. Aquí tienes tu enlace:\n${escapeMarkdown(WEB_LINK)}`,
        { parse_mode: 'MarkdownV2', reply_markup: { remove_keyboard: true } }
      );
    } catch (error) {
      // No re-lanzamos el error: si esto fallara y se dejara propagar sin
      // manejar, en un entorno con reinicio automático (nodemon/pm2) podría
      // encadenar caídas y reprocesamientos del mismo mensaje. Aquí se
      // informa el motivo exacto al usuario y el bot sigue funcionando con
      // normalidad para el resto de comandos.
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      console.error(`[ERROR] Guardando teléfono (/web): ${msg}`);
      // Dejamos el estado "pendiente" activo para que el usuario pueda
      // reintentar sin tener que escribir /web de nuevo.
      pendingPhoneRequests.set(telegramId, Date.now() + PENDING_PHONE_TTL_MS);
      await ctx.reply(
        `❌ No pude guardar tu número de teléfono\\. ${escapeMarkdown(msg)}\n\nPuedes intentarlo de nuevo escribiendo tu número o pulsando el botón\\.`,
        { parse_mode: 'MarkdownV2' }
      );
    }
  }

  // Maneja el contacto que Telegram envía cuando el usuario presiona el
  // botón "Compartir mi número de teléfono" generado arriba.
  bot.on('contact', async (ctx) => {
    const telegramId = ctx.from.id;
    const contact = ctx.message && 'contact' in ctx.message ? ctx.message.contact : undefined;

    if (!contact) return;

    // Seguridad: solo aceptamos el contacto si es el propio número del
    // usuario (no el de un tercero que reenvíe una tarjeta de contacto).
    if (contact.user_id && contact.user_id !== telegramId) {
      await ctx.reply(
        '⚠️ Debes compartir *tu propio* número de teléfono, no el de otra persona\\.',
        { parse_mode: 'MarkdownV2', reply_markup: { remove_keyboard: true } }
      );
      return;
    }

    await saveAndConfirm(ctx, telegramId, contact.phone_number);
  });

  // Captura el número cuando el usuario prefiere ESCRIBIRLO en vez de usar
  // el botón. Solo actúa si hay una solicitud de teléfono pendiente para
  // ese usuario (evita interferir con cualquier otro texto/flujo del bot),
  // y siempre llama a next() cuando no aplica, para no romper el resto de
  // comandos ni otros flujos (email, cloud, etc.).
  bot.on('text', async (ctx, next) => {
    const telegramId = ctx.from.id;
    const text = ctx.message.text.trim();

    // Los comandos (incluido /cancelar) los maneja otro handler o, si no
    // existe, simplemente se ignoran aquí para no interferir.
    if (text.startsWith('/')) {
      if (text.toLowerCase().startsWith('/cancelar') && isPending(telegramId)) {
        pendingPhoneRequests.delete(telegramId);
        await ctx.reply('Operación cancelada. Puedes volver a intentarlo con /web cuando quieras.', {
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
