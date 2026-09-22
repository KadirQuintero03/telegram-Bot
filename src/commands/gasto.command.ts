import { Telegraf } from 'telegraf';
import { randomUUID } from 'crypto';
import { BotContext } from '../types/bot.types.js';
import { GeminiService } from '../services/gemini.service.js';
import { dataStore, Gasto } from '../services/dataStore.service.js';
import { userRegistry } from '../services/userRegistry.service.js';
import { commandTrigger, getCommandArgs } from '../utils/commandMatcher.js';
import { deleteCommandMessage, safeReply } from '../utils/telegramHelpers.js';
import { escapeMarkdown } from '../utils/formatters.js';
import { escapeCop } from '../utils/gastos.js';

const geminiService = new GeminiService();

const CATEGORY_PROMPT =
  'Clasifica el siguiente gasto en UNA sola categoría de esta lista: '+
  'Comida, Transporte, Servicios, Ocio, Salud, Educación, Otros. '+
  'Responde ÚNICAMENTE con el nombre de la categoría, sin puntos ni texto extra.';

const EXTRACTION_PROMPT =
  'Eres un intérprete de gastos. A partir del texto, devuelve ÚNICAMENTE un objeto JSON válido con esta estructura exacta: ' +
  '{"monto": 0, "descripcion": "...", "fecha": "AAAA-MM-DD"}. ' +
  'El "monto" es el valor gastado en pesos colombianos (COP): solo el número, sin símbolos, sin separadores de miles ni unidades (usa punto para decimales si hace falta). ' +
  'La "descripcion" es una frase corta que indique en qué se gastó (ej: "gasolina"). ' +
  'La "fecha" es el día del gasto en formato AAAA-MM-DD. Si el texto no menciona el año, usa el año de HOY conservando el mes y el día indicados. ' +
  'Interpreta fechas en lenguaje natural (ej: "hoy", "ayer", "el 20 de agosto"). ' +
  'No agregues texto adicional, solo el JSON.';

export function registerGastoCommand(bot: Telegraf<BotContext>): void {
  bot.hears(commandTrigger('gasto'), async (ctx) => {
    const args = getCommandArgs(ctx.message.text).trim();
    const chatId = ctx.chat?.id;

    if (!args) {
      await ctx.reply('Describe tu gasto en lenguaje natural. Ejemplo: `/gasto me gaste 15000 en gasolina el 20 de agosto de 2026`', {
        parse_mode: 'Markdown',
      });
      await deleteCommandMessage(ctx);
      return;
    }

    const hoy = new Date().toISOString().slice(0, 10);
    const parsed = await parseGastoSmart(args, hoy);
    if (!parsed) {
      await ctx.reply('No pude interpretar el gasto. Ejemplo: `/gasto me gaste 15000 en gasolina el 20 de agosto de 2026`', {
        parse_mode: 'Markdown',
      });
      await deleteCommandMessage(ctx);
      return;
    }

    const { monto, descripcion } = parsed;

    try {
      await ctx.sendChatAction('typing');
      const categoria = await classifyCategory(descripcion);

      const gasto: Gasto = {
        id: randomUUID(),
        chatId: chatId ?? 0,
        usuario: resolveUsuario(ctx),
        monto,
        descripcion,
        categoria,
        fecha: toStoredTimestamp(parsed.fecha),
      };

      dataStore.addGasto(gasto);

      await safeReply(
        ctx,
        `*Gasto registrado en pesos colombianos \\(COP\\)*\n` +
        `Monto: *$${escapeCop(monto)} COP*\n` +
        `Descripción: ${escapeMarkdown(descripcion)}\n` +
        `Categoría: *${escapeMarkdown(categoria)}*\n` +
        `Fecha: *${escapeMarkdown(formatFechaDDMMAAAA(gasto.fecha))}*`
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      console.error(`[ERROR] /gasto: ${msg}`);
      await safeReply(ctx, `No pude registrar el gasto\\.\n${escapeMarkdown(msg)}`);
    } finally {
      await deleteCommandMessage(ctx);
    }
  });
}

/** Extrae el monto numérico y la descripción de los argumentos del comando /gasto (COP). */
function parseGasto(args: string): { monto: number | null; descripcion: string } {
  const match = args.match(/^([\d.,]+)\s+(.+)$/);
  if (!match) return { monto: null, descripcion: ''};

  // Formato COP: el punto separa miles (12.500) y la coma los decimales (12.500,50).
  const monto = parseFloat(match[1]!.replace(/\./g, '').replace(',', '.'));
  if (Number.isNaN(monto) || monto <= 0) return { monto: null, descripcion: ''};

  return { monto, descripcion: match[2]!.trim() };
}

interface ParsedGastoIA {
  monto: number;
  descripcion: string;
  fecha: string;
}

/** Resuelve el nombre de usuario de quien registra el gasto (Telegram o registro). */
function resolveUsuario(ctx: BotContext): string {
  const from = ctx.from;
  if (from?.username) return from.username;
  if (from?.first_name) return from.first_name;
  const chatId = ctx.chat?.id;
  if (chatId !== undefined) return userRegistry.getUsername(chatId) ?? 'Desconocido';
  return 'Desconocido';
}

/** Interpreta el gasto con Gemini y, si falla o da datos inválidos, usa el parseo clásico. */
async function parseGastoSmart(texto: string, hoy: string): Promise<ParsedGastoIA | null> {
  const ia = await parseGastoIA(texto, hoy);
  if (ia) return ia;

  const legacy = parseGasto(texto);
  if (legacy.monto === null || !legacy.descripcion) return null;
  return { monto: legacy.monto, descripcion: legacy.descripcion, fecha: hoy };
}

/** Pide a Gemini que extraiga monto, descripción y fecha de un texto libre en lenguaje natural. */
async function parseGastoIA(texto: string, hoy: string): Promise<ParsedGastoIA | null> {
  try {
    const response = await geminiService.generateText(`${EXTRACTION_PROMPT}\nHoy es: ${hoy}\nTexto: ${texto}`);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const raw = JSON.parse(jsonMatch[0]) as Partial<ParsedGastoIA>;

    const monto = Number(raw.monto);
    const descripcion = (raw.descripcion ?? '').toString().trim();
    if (!Number.isFinite(monto) || monto <= 0 || !descripcion) return null;

    const fecha = isValidYYYYMMDD(raw.fecha) ? raw.fecha : hoy;
    return { monto, descripcion, fecha };
  } catch {
    return null;
  }
}

/** Valida una fecha en formato AAAA-MM-DD que corresponda a un día real. */
function isValidYYYYMMDD(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/** Convierte AAAA-MM-DD a un timestamp ISO con medianoche local (consistente con los resúmenes). */
function toStoredTimestamp(yyyyMMdd: string): string {
  const [year, month, day] = yyyyMMdd.split('-').map(Number);
  return new Date(year!, month! - 1, day!).toISOString();
}

/** Formatea un timestamp ISO como DD/MM/AAAA. */
function formatFechaDDMMAAAA(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/** Pide a Gemini la categoría del gasto; si falla o no es válida, devuelve "Otros". */
async function classifyCategory(descripcion: string): Promise<string> {
  try {
    const response = await geminiService.generateText(`${CATEGORY_PROMPT}\nGasto: ${descripcion}`);
    const clean = response.trim().replace(/[.\n]/g, '');
    const valid = ['Comida', 'Transporte', 'Servicios', 'Ocio', 'Salud', 'Educación', 'Otros'];
    return valid.find((c) => c.toLowerCase() === clean.toLowerCase()) ?? 'Otros';
  } catch {
    return 'Otros';
  }
}
