import axios from 'axios';
import { MyMemoryResponse, TranslationResult } from '../types/translation.types.js';

const MYMEMORY_URL = 'https://api.mymemory.translated.net/get';
const TIMEOUT_MS = 5000;

const languageNames: Record<string, string> = {
  en: 'Inglés',
  fr: 'Francés',
  de: 'Alemán',
  pt: 'Portugués',
  it: 'Italiano',
  ja: 'Japonés',
  ko: 'Coreano',
  zh: 'Chino',
  ru: 'Ruso',
  ar: 'Árabe',
  es: 'Español',
  nl: 'Holandés',
  pl: 'Polaco',
  sv: 'Sueco',
  da: 'Danés',
  fi: 'Finlandés',
  no: 'Noruego',
  tr: 'Turco',
  hi: 'Hindi',
  vi: 'Vietnamita',
  th: 'Tailandés',
  id: 'Indonesio',
};

export class TranslationService {
  async translate(text: string): Promise<TranslationResult> {
    const response = await axios.get<MyMemoryResponse>(MYMEMORY_URL, {
      params: {
        q: text,
        langpair: 'autodetect|es',
      },
      timeout: TIMEOUT_MS,
    });

    const data = response.data;

    if (data.responseStatus !== 200) {
      throw new Error('Error al traducir el texto. Intenta más tarde.');
    }

    const translatedText = data.responseData.translatedText;
    let detectedLanguage = 'Desconocido';

    if (data.matches && data.matches.length > 0) {
      const firstMatch = data.matches[0];
      if (firstMatch?.source) {
        const langCode = firstMatch.source.toLowerCase().split('-')[0] ?? '';
        detectedLanguage = languageNames[langCode] ?? langCode.toUpperCase();
      }
    }

    return {
      originalText: text,
      translatedText,
      detectedLanguage,
    };
  }
}
