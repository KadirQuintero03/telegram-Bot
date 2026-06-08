export interface MyMemoryResponse {
  responseData: {
    translatedText: string;
    match: number;
  };
  responseStatus: number;
  detectedLanguage?: {
    language: string;
    confidence: number;
  };
  matches?: Array<{
    segment: string;
    translation: string;
    source: string;
    target: string;
  }>;
}

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  detectedLanguage: string;
}
