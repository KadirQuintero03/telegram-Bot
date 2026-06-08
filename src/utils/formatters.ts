import { WeatherData } from '../types/weather.types.js';
import { TranslationResult } from '../types/translation.types.js';

export function escapeMarkdown(text: string): string {
  return text.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

export function formatWeatherMessage(data: WeatherData): string {
  const city = escapeMarkdown(`${data.city}, ${data.country}`);
  return (
    `🌤 *Clima en ${city}*\n\n` +
    `🌡 Temperatura: *${data.temperature}${data.unit}*\n` +
    `🤔 Sensación térmica: *${data.feelsLike}${data.unit}*\n` +
    `💧 Humedad: *${data.humidity}%*\n` +
    `💨 Viento: *${data.windSpeed} km/h*\n` +
    `📋 Estado: *${escapeMarkdown(data.description)}*`
  );
}

export function formatTranslationMessage(result: TranslationResult): string {
  const original = escapeMarkdown(result.originalText);
  const translated = escapeMarkdown(result.translatedText);
  const lang = escapeMarkdown(result.detectedLanguage);
  return (
    `🌐 *Traducción al Español*\n\n` +
    `📝 *Original \\(${lang}\\):*\n${original}\n\n` +
    `✅ *Traducción:*\n${translated}`
  );
}
