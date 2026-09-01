import { WeatherData } from '../types/weather.types.js';
import { TranslationResult } from '../types/translation.types.js';
import { DolarConversion, DolarRate } from '../types/dolar.types.js';

export function escapeMarkdown(text: string): string {
  return text.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

export function formatWeatherMessage(data: WeatherData): string {
  const city = escapeMarkdown(`${data.city}, ${data.country}`);
  return (
    `*Clima en ${city}*\n\n` +
    `Temperatura: *${data.temperature}${data.unit}*\n` +
    `Sensación térmica: *${data.feelsLike}${data.unit}*\n` +
    `Humedad: *${data.humidity}%*\n` +
    `Viento: *${data.windSpeed} km/h*\n` +
    `Estado: *${escapeMarkdown(data.description)}*`
  );
}

export function formatTranslationMessage(result: TranslationResult): string {
  const original = escapeMarkdown(result.originalText);
  const translated = escapeMarkdown(result.translatedText);
  const lang = escapeMarkdown(result.detectedLanguage);
  return (
    `*Original \\(${lang}\\):*\n${original}\n\n` +
    `*Traducción:*\n${translated}`
  );
}

function formatCop(amount: number): string {
  return amount.toLocaleString('es-CO', { maximumFractionDigits: 2 });
}

export function formatDolarRateMessage(data: DolarRate): string {
  const rate = escapeMarkdown(formatCop(data.rate));
  const date = escapeMarkdown(data.lastUpdate);
  return (
    `*Precio del Dólar hoy*\n\n` +
    `1 USD \\= *$${rate} COP*\n\n`
  );
}

export function formatDolarConversionMessage(data: DolarConversion): string {
  const usd = escapeMarkdown(
    data.usdAmount.toLocaleString('es-CO', { maximumFractionDigits: 2 })
  );
  const cop = escapeMarkdown(formatCop(data.copAmount));
  const rate = escapeMarkdown(formatCop(data.rate));
  const date = escapeMarkdown(data.lastUpdate);
  return (
    `*Conversión de Dólares a Pesos*\n\n` +
    `$${usd} USD \\= *$${cop} COP*\n\n` +
    `Tasa usada: 1 USD \\= $${rate} COP\n`
  );
}
