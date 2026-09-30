import { randomUUID } from 'crypto';
import { GeminiService } from './gemini.service.js';
import { dataStore, Gasto } from './data-store.service.js';
import { userRegistry } from './user-registry.service.js';
import { BotContext } from '../types/bot.types.js';

const CATEGORY_PROMPT =
  'Clasifica el siguiente gasto en UNA sola categoría de esta lista: ' +
  'Comida, Transporte, Servicios, Ocio, Salud, Educación, Otros. ' +
  'Responde ÚNICAMENTE con el nombre de la categoría, sin puntos ni texto extra.';

const EXTRACTION_PROMPT =
  'Eres un intérprete de gastos. A partir del texto, devuelve ÚNICAMENTE un objeto JSON válido con esta estructura exacta: ' +
  '{"monto": 0, "descripcion": "...", "fecha": "AAAA-MM-DD"}. ' +
  'El "monto" es el valor gastado en pesos colombianos (COP): solo el número, sin símbolos, sin separadores de miles ni unidades (usa punto para decimales si hace falta). ' +
  'La "descripcion" es una frase corta que indique en qué se gastó (ej: "gasolina"). ' +
  'La "fecha" es el día del gasto en formato AAAA-MM-DD. Si el texto no menciona el año, usa el año de HOY conservando el mes y el día indicados. ' +
  'Interpreta fechas en lenguaje natural (ej: "hoy", "ayer", "el 20 de agosto"). ' +
  'No agregues texto adicional, solo el JSON.';

export interface ParsedGastoIA {
  monto: number;
  descripcion: string;
  fecha: string;
}

export class GastoService {
  private geminiService = new GeminiService();

  async processAndSaveGasto(ctx: BotContext, args: string): Promise<Gasto | null> {
    const hoy = new Date().toISOString().slice(0, 10);
    const parsed = await this.parseGastoSmart(args, hoy);
    if (!parsed) return null;

    const { monto, descripcion } = parsed;
    const categoria = await this.classifyCategory(descripcion);
    const chatId = ctx.chat?.id ?? 0;

    const gasto: Gasto = {
      id: randomUUID(),
      chatId,
      usuario: this.resolveUsuario(ctx),
      monto,
      descripcion,
      categoria,
      fecha: this.toStoredTimestamp(parsed.fecha),
    };

    dataStore.addGasto(gasto);
    return gasto;
  }

  private resolveUsuario(ctx: BotContext): string {
    const from = ctx.from;
    if (from?.username) return from.username;
    if (from?.first_name) return from.first_name;
    const chatId = ctx.chat?.id;
    if (chatId !== undefined) return userRegistry.getUsername(chatId) ?? 'Desconocido';
    return 'Desconocido';
  }

  private async parseGastoSmart(texto: string, hoy: string): Promise<ParsedGastoIA | null> {
    const ia = await this.parseGastoIA(texto, hoy);
    if (ia) return ia;

    const legacy = this.parseGasto(texto);
    if (legacy.monto === null || !legacy.descripcion) return null;
    return { monto: legacy.monto, descripcion: legacy.descripcion, fecha: hoy };
  }

  private parseGasto(args: string): { monto: number | null; descripcion: string } {
    const match = args.match(/^([\d.,]+)\s+(.+)$/);
    if (!match) return { monto: null, descripcion: '' };

    const monto = parseFloat(match[1]!.replace(/\./g, '').replace(',', '.'));
    if (Number.isNaN(monto) || monto <= 0) return { monto: null, descripcion: '' };

    return { monto, descripcion: match[2]!.trim() };
  }

  private async parseGastoIA(texto: string, hoy: string): Promise<ParsedGastoIA | null> {
    try {
      const response = await this.geminiService.generateText(`${EXTRACTION_PROMPT}\nHoy es: ${hoy}\nTexto: ${texto}`);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;
      const raw = JSON.parse(jsonMatch[0]) as Partial<ParsedGastoIA>;

      const monto = Number(raw.monto);
      const descripcion = (raw.descripcion ?? '').toString().trim();
      if (!Number.isFinite(monto) || monto <= 0 || !descripcion) return null;

      const fecha = this.isValidYYYYMMDD(raw.fecha) ? raw.fecha : hoy;
      return { monto, descripcion, fecha };
    } catch {
      return null;
    }
  }

  private isValidYYYYMMDD(value: unknown): value is string {
    if (typeof value !== 'string') return false;
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return false;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  }

  private toStoredTimestamp(yyyyMMdd: string): string {
    const [year, month, day] = yyyyMMdd.split('-').map(Number);
    return new Date(year!, month! - 1, day!).toISOString();
  }

  public formatFechaDDMMAAAA(iso: string): string {
    const date = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
  }

  private async classifyCategory(descripcion: string): Promise<string> {
    try {
      const response = await this.geminiService.generateText(`${CATEGORY_PROMPT}\nGasto: ${descripcion}`);
      const clean = response.trim().replace(/[.\n]/g, '');
      const valid = ['Comida', 'Transporte', 'Servicios', 'Ocio', 'Salud', 'Educación', 'Otros'];
      return valid.find((c) => c.toLowerCase() === clean.toLowerCase()) ?? 'Otros';
    } catch {
      return 'Otros';
    }
  }
}

export const gastoService = new GastoService();
