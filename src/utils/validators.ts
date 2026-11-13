const TIKTOK_URL_REGEX = /^https?:\/\/(www\.|vm\.|vt\.|m\.)?tiktok\.com\/.+/i;

export function validateTikTokUrl(
  text: string | undefined
): { valid: boolean; url?: string; error?: string } {
  if (!text || text.trim().length === 0) {
    return {
      valid: false,
      error: 'Debes proporcionar un enlace de TikTok. Ejemplo: `/get https://vm.tiktok.com/XXXXXXX`',
    };
  }

  const url = text.trim().split(/\s+/)[0]!;
  if (!TIKTOK_URL_REGEX.test(url)) {
    return { valid: false, error: 'El enlace no parece ser de TikTok. Verifica que esté completo.' };
  }

  return { valid: true, url };
}

export function parseTikTokUrlMeta(url: string): { username: string; videoId: string } {
  const match = url.match(/tiktok\.com\/@([\w.-]+)\/video\/(\d+)/i);
  return {
    username: match?.[1] ?? 'tiktok',
    videoId: match?.[2] ?? Date.now().toString(),
  };
}

export function validateDolarArg(
  text: string | undefined
): { valid: boolean; amount?: number; error?: string } {
  const trimmed = (text ?? '').trim();

  if (trimmed.length === 0) {
    return { valid: true };
  }

  const normalized = trimmed.replace(',', '.');
  const amount = Number(normalized);

  if (Number.isNaN(amount) || !Number.isFinite(amount)) {
    return { valid: false, error: 'Debes indicar un número válido. Ejemplo: `/dolar 20`' };
  }

  if (amount <= 0) {
    return { valid: false, error: 'La cantidad de dólares debe ser mayor a 0.' };
  }

  if (amount > 1_000_000_000) {
    return { valid: false, error: 'La cantidad es demasiado grande.' };
  }

  return { valid: true, amount };
}

export type SupportedPlatform = 'tiktok' | 'instagram' | 'youtube';

const PLATFORM_PATTERNS: Record<SupportedPlatform, RegExp> = {
  tiktok: /^https?:\/\/(www\.|vm\.|vt\.|m\.)?tiktok\.com\/.+/i,
  instagram: /^https?:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[A-Za-z0-9_\-]+/i,
  youtube: /^https?:\/\/(www\.)?(youtube\.com\/shorts\/[A-Za-z0-9_\-]+|youtu\.be\/[A-Za-z0-9_\-]+)/i,
};

export function detectPlatform(url: string): SupportedPlatform | null {
  for (const [platform, regex] of Object.entries(PLATFORM_PATTERNS)) {
    if (regex.test(url)) return platform as SupportedPlatform;
  }
  return null;
}

export function validateDownloadUrl(
  text: string | undefined
): { valid: boolean; url?: string; platform?: SupportedPlatform; error?: string } {
  if (!text || text.trim().length === 0) {
    return {
      valid: false,
      error:
        'Debes proporcionar un enlace. Ejemplos:\n' +
        '`/get https://vm.tiktok.com/XXX`\n' +
        '`/get https://www.instagram.com/reel/XXX`\n' +
        '`/get https://youtube.com/shorts/XXX`',
    };
  }

  const url = text.trim().split(/\s+/)[0]!;
  const platform = detectPlatform(url);

  if (!platform) {
    return {
      valid: false,
      error: 'El enlace no es de TikTok, Instagram ni YouTube Shorts.',
    };
  }

  return { valid: true, url, platform };
}
