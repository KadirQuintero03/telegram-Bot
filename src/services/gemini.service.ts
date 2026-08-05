import axios from 'axios';
import { config } from '../config/env.js';

export interface GeminiInlinePart {
  inlineData: {
    mimeType: string;
    data: string;
  };
}

export interface GeminiTextPart {
  text: string;
}

export type GeminiPart = GeminiInlinePart | GeminiTextPart;

interface GeminiApiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    finishReason?: string;
  }>;
  promptFeedback?: {
    blockReason?: string;
  };
}

const TIMEOUT_MS = 60000;

export class GeminiService {
  private readonly apiKey: string;
  private readonly model: string;

  constructor() {
    this.apiKey = config.geminiApiKey;
    this.model = config.geminiModel;
  }

  private get endpoint(): string {
    return `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;
  }

    async generateContent(parts: GeminiPart[]): Promise<string> {
    if (!this.apiKey) {
      throw new Error('La API de IA no está configurada (falta GEMINI_API_KEY).');
    }

    try {
      const response = await axios.post<GeminiApiResponse>(
        this.endpoint,
        { contents: [{ role: 'user', parts }] },
        {
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
          timeout: TIMEOUT_MS,
        }
      );

      const data = response.data;

      if (data.promptFeedback?.blockReason) {
        throw new Error(
          `El contenido fue bloqueado por Gemini (motivo: ${data.promptFeedback.blockReason}).`
        );
      }

      const text = data.candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? '')
        .join('')
        .trim();

      if (!text) {
        throw new Error('Gemini no devolvió ningún resultado. Intenta con otro archivo o texto.');
      }

      return text;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const apiMessage =
          (error.response?.data as { error?: { message?: string } } | undefined)?.error?.message;

        if (status === 401 || status === 403) {
          throw new Error('La API Key de Gemini es inválida o no tiene permisos.');
        }
        if (status === 429) {
          throw new Error('Se alcanzó el límite de uso de la API de Gemini. Intenta más tarde.');
        }
        if (status === 400 && apiMessage) {
          throw new Error(`Gemini rechazó la solicitud: ${apiMessage}`);
        }
        if (error.code === 'ECONNABORTED') {
          throw new Error('Gemini tardó demasiado en responder. Intenta de nuevo.');
        }
        throw new Error(apiMessage ?? 'No se pudo contactar a la API de Gemini.');
      }
      throw error;
    }
  }

  async generateText(prompt: string): Promise<string> {
    return this.generateContent([{ text: prompt }]);
  }

  async generateFromMedia(
    buffer: Buffer,
    mimeType: string,
    instruction: string
  ): Promise<string> {
    return this.generateContent([
      { inlineData: { mimeType, data: buffer.toString('base64') } },
      { text: instruction },
    ]);
  }
}
