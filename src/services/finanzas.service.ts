import { randomUUID } from 'crypto';
import { GeminiService } from './gemini.service.js';
import { dataStore } from './data-store.service.js';
import { FinanzaTransaction, TransactionType, UserFinanceProfile } from '../types/finanzas.types.js';
import { normalizeDateDDMMAAAA } from '../utils/finanzas.js';

interface ParsedTransactionData {
  tipo?: TransactionType;
  monto: number;
  categoria: string;
  descripcion: string;
  fecha?: string;
}

const TEXT_EXTRACTION_PROMPT = `
Eres un experto intérprete de transacciones financieras. A partir del texto proporcionado, extrae los datos de la transacción y devuelve ÚNICAMENTE un objeto JSON válido con esta estructura exacta:
{
  "monto": 0,
  "categoria": "...",
  "descripcion": "...",
  "fecha": "DD/MM/AAAA"
}
Reglas:
1. "monto": número positivo en pesos colombianos (COP), sin comas ni símbolos (ej: 130000 para 130.000 COP).
2. "categoria": elige la más adecuada (ejemplos: Comida, Transporte, Servicios, Ocio, Salud, Educación, Trabajo, Salario, Ventas, Inversiones, Otros).
3. "descripcion": frase corta descriptiva.
4. "fecha": fecha en formato estricto DD/MM/AAAA. Si el texto incluye fecha (ej: 3/8/26, 03/08/2026, ayer, el 20 de agosto), conviértela a DD/MM/AAAA. Si no menciona fecha, devuelve la fecha de HOY facilitada abajo.
No agregues ningún texto fuera del JSON.
`;

const VOICE_EXTRACTION_PROMPT = `
Eres un analista financiero profesional. Analiza fielmente el audio adjunto en donde el usuario describe una transacción financiera.
Determina si se trata de un GASTO (dinero que salió) o un INGRESO (dinero que entró).
Devuelve ÚNICAMENTE un objeto JSON válido con la siguiente estructura exacta:
{
  "tipo": "gasto" | "ingreso",
  "monto": 0,
  "categoria": "...",
  "descripcion": "...",
  "fecha": "DD/MM/AAAA"
}
Reglas:
1. "tipo": debe ser "gasto" o "ingreso".
2. "monto": número entero positivo en pesos colombianos (COP) (ej: 50000, 130000).
3. "categoria": categoría financiera profesional (ej: Comida, Transporte, Servicios, Ocio, Salud, Educación, Salario, Trabajo, Ventas, Inversiones, Otros).
4. "descripcion": resumen claro de lo mencionado en el audio.
5. "fecha": formato DD/MM/AAAA. Si la persona dice "hoy", "ayer" o no especifica fecha, usa la fecha de HOY facilitada abajo.
No agregues nada fuera del JSON.
`;

export class FinanzasService {
  private geminiService = new GeminiService();

  async registerTextTransaction(
    telegramId: number,
    chatId: number,
    usuario: string,
    rawText: string,
    defaultType: TransactionType
  ): Promise<{ transaction: FinanzaTransaction; profile: UserFinanceProfile } | null> {
    const todayFormatted = normalizeDateDDMMAAAA();
    let parsedData = await this.parseTextWithAI(rawText, todayFormatted);

    if (!parsedData || !parsedData.monto || parsedData.monto <= 0) {
      const fallback = this.fallbackParseText(rawText);
      if (!fallback || !fallback.monto) return null;
      parsedData = {
        monto: fallback.monto,
        categoria: fallback.categoria,
        descripcion: fallback.descripcion,
        fecha: fallback.fecha,
      };
    }

    const fechaFinal = normalizeDateDDMMAAAA(parsedData.fecha);

    const tx: FinanzaTransaction = {
      id: randomUUID(),
      telegramId,
      chatId,
      usuario,
      tipo: parsedData.tipo ?? defaultType,
      monto: Math.round(parsedData.monto),
      categoria: parsedData.categoria || 'Otros',
      descripcion: parsedData.descripcion || 'Registro de finanza',
      fecha: fechaFinal,
      createdAt: new Date().toISOString(),
    };

    const profile = dataStore.addTransaction(tx);
    return { transaction: tx, profile };
  }

  async registerVoiceTransaction(
    telegramId: number,
    chatId: number,
    usuario: string,
    audioBuffer: Buffer,
    mimeType: string
  ): Promise<{ transaction: FinanzaTransaction; profile: UserFinanceProfile } | null> {
    const todayFormatted = normalizeDateDDMMAAAA();
    const parsedData = await this.parseVoiceWithAI(audioBuffer, mimeType, todayFormatted);

    if (!parsedData || !parsedData.monto || parsedData.monto <= 0 || !parsedData.tipo) {
      return null;
    }

    const fechaFinal = normalizeDateDDMMAAAA(parsedData.fecha);

    const tx: FinanzaTransaction = {
      id: randomUUID(),
      telegramId,
      chatId,
      usuario,
      tipo: parsedData.tipo,
      monto: Math.round(parsedData.monto),
      categoria: parsedData.categoria || 'Otros',
      descripcion: parsedData.descripcion || 'Registro por voz',
      fecha: fechaFinal,
      createdAt: new Date().toISOString(),
    };

    const profile = dataStore.addTransaction(tx);
    return { transaction: tx, profile };
  }

  private async parseTextWithAI(text: string, today: string): Promise<ParsedTransactionData | null> {
    try {
      const prompt = `${TEXT_EXTRACTION_PROMPT}\nHoy es: ${today}\nTexto: "${text}"`;
      const response = await this.geminiService.generateText(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;
      return JSON.parse(jsonMatch[0]) as ParsedTransactionData;
    } catch {
      return null;
    }
  }

  private async parseVoiceWithAI(
    audioBuffer: Buffer,
    mimeType: string,
    today: string
  ): Promise<ParsedTransactionData | null> {
    try {
      const instruction = `${VOICE_EXTRACTION_PROMPT}\nHoy es: ${today}`;
      const response = await this.geminiService.generateFromMedia(audioBuffer, mimeType, instruction);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;
      return JSON.parse(jsonMatch[0]) as ParsedTransactionData;
    } catch {
      return null;
    }
  }

  private fallbackParseText(text: string): ParsedTransactionData | null {
    const trimmed = text.trim();
    const match = trimmed.match(/^([\d.,]+)\s+(\S+)\s+(.+)$/);
    if (!match) return null;

    const monto = parseFloat(match[1]!.replace(/\./g, '').replace(',', '.'));
    if (Number.isNaN(monto) || monto <= 0) return null;

    return {
      monto,
      categoria: match[2]!.trim(),
      descripcion: match[3]!.trim(),
      fecha: normalizeDateDDMMAAAA(),
    };
  }
}

export const finanzasService = new FinanzasService();
