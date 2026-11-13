import { DolarConversion, DolarRate } from '../types/dolar.types.js';

export function escapeMarkdown(text: string): string {
  return text.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

function formatCop(amount: number): string {
  return amount.toLocaleString('es-CO', { maximumFractionDigits: 2 });
}

export function formatDolarRateMessage(data: DolarRate): string {
  const rate = escapeMarkdown(formatCop(data.rate));
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
  return (
    `*Conversión de Dólares a Pesos*\n\n` +
    `$${usd} USD \\= *$${cop} COP*\n\n` +
    `Tasa usada: 1 USD \\= $${rate} COP\n`
  );
}
