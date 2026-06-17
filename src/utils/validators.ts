export function validateCityArg(text: string | undefined): { valid: boolean; city?: string; error?: string } {
  if (!text || text.trim().length === 0) {
    return {
      valid: false,
      error: '⚠️ Debes indicar una ciudad. Ejemplo: `/clima Bogotá`',
    };
  }
  const city = text.trim();
  if (city.length > 100) {
    return { valid: false, error: '⚠️ El nombre de la ciudad es demasiado largo.' };
  }
  return { valid: true, city };
}

export function validateTranslateArg(text: string | undefined): { valid: boolean; text?: string; error?: string } {
  if (!text || text.trim().length === 0) {
    return {
      valid: false,
      error: '⚠️ Debes proporcionar un texto. Ejemplo: `/traducir Hello world`',
    };
  }
  if (text.trim().length > 500) {
    return { valid: false, error: '⚠️ El texto no puede superar los 500 caracteres.' };
  }
  return { valid: true, text: text.trim() };
}

const TIKTOK_URL_REGEX = /^https?:\/\/(www\.|vm\.|vt\.|m\.)?tiktok\.com\/.+/i;

export function validateTikTokUrl(
  text: string | undefined
): { valid: boolean; url?: string; error?: string } {
  if (!text || text.trim().length === 0) {
    return {
      valid: false,
      error: '⚠️ Debes proporcionar un enlace de TikTok. Ejemplo: `/get https://vm.tiktok.com/XXXXXXX`',
    };
  }

  const url = text.trim().split(/\s+/)[0]!;
  if (!TIKTOK_URL_REGEX.test(url)) {
    return { valid: false, error: '⚠️ El enlace no parece ser de TikTok. Verifica que esté completo.' };
  }

  return { valid: true, url };
}

export function validateDeleteArg(
  text: string | undefined,
  max: number
): { valid: boolean; count?: number; error?: string } {
  if (!text || text.trim().length === 0) {
    return {
      valid: false,
      error: `⚠️ Debes indicar cuántos mensajes borrar. Ejemplo: \`/borrar 10\``,
    };
  }
  const n = parseInt(text.trim(), 10);
  if (isNaN(n) || n < 1) {
    return { valid: false, error: '⚠️ El número debe ser un entero mayor a 0.' };
  }
  if (n > max) {
    return { valid: false, error: `⚠️ El máximo permitido es ${max} mensajes.` };
  }
  return { valid: true, count: n };
}
