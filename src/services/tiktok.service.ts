import axios from 'axios';
import { config } from '../config/env.js';

const REQUEST_TIMEOUT_MS = 60000;

// Headers de respaldo: solo se usan si la respuesta del downloader es un
// JSON que apunta a una URL directa del CDN de TikTok (esa sí los necesita).
const FALLBACK_HEADERS = {
    'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Referer: 'https://www.tiktok.com/',
};

export class TikTokService {
    /**
     * Descarga el video delegando la extracción a un servicio propio
     * (self-hosted) configurado en TIKTOK_DOWNLOADER_BASE_URL.
     *
     * Soporta dos formas de respuesta del endpoint, ya que no conocemos
     * el formato exacto hasta probarlo en vivo:
     *  - Binario directo (content-type "video/*" u "octet-stream"): se usa tal cual.
     *  - JSON con una URL de video embebida: se busca esa URL y se descarga aparte.
     */
    async downloadVideo(postUrl: string): Promise<Buffer> {
        const baseUrl = config.tiktokDownloaderBaseUrl;
        if (!baseUrl) {
            throw new Error(
                'Falta configurar TIKTOK_DOWNLOADER_BASE_URL en el .env con la URL de tu servicio de descarga.'
            );
        }

        const endpoint = `${baseUrl.replace(/\/+$/, '')}/api/v1/download`;

        const response = await axios.get(endpoint, {
            params: { postUrl },
            responseType: 'arraybuffer',
            timeout: REQUEST_TIMEOUT_MS,
            maxRedirects: 5,
        });

        const contentType = String(response.headers['content-type'] ?? '').toLowerCase();
        const buffer = Buffer.from(response.data);

        if (contentType.startsWith('video/') || contentType.includes('octet-stream')) {
            return buffer;
        }

        if (contentType.includes('application/json')) {
            return this.resolveFromJson(buffer);
        }

        // Content-type ambiguo o ausente: si el tamaño parece un video, lo aceptamos igual.
        if (buffer.length > 50_000) {
            return buffer;
        }

        throw new Error(
            `Respuesta inesperada del servicio de descarga (content-type: ${contentType || 'desconocido'}, ${buffer.length} bytes).`
        );
    }

    // ── Privados ─────────────────────────────────────────────────────

    private async resolveFromJson(buffer: Buffer): Promise<Buffer> {
        let json: unknown;
        try {
            json = JSON.parse(buffer.toString('utf-8'));
        } catch {
            throw new Error('El servicio de descarga devolvió una respuesta no válida (JSON corrupto).');
        }

        const videoUrl = this.findVideoUrl(json);
        if (!videoUrl) {
            throw new Error(
                'No se encontró una URL de video dentro de la respuesta JSON del servicio de descarga.'
            );
        }

        const response = await axios.get<ArrayBuffer>(videoUrl, {
            responseType: 'arraybuffer',
            timeout: REQUEST_TIMEOUT_MS,
            maxRedirects: 5,
            headers: FALLBACK_HEADERS,
        });

        return Buffer.from(response.data);
    }

    // Busca recursivamente, en cualquier nivel del JSON, un string que parezca
    // una URL de video descargable. Revisa primero las claves más comunes
    // usadas por este tipo de servicios antes de recorrer todo el objeto.
    private findVideoUrl(value: unknown): string | null {
        if (typeof value === 'string') {
            const looksLikeVideoUrl =
                /^https?:\/\/.+\.mp4(\?.*)?$/i.test(value) || /tiktokcdn|tiktokv\.com|muscdn/i.test(value);
            return looksLikeVideoUrl ? value : null;
        }

        if (Array.isArray(value)) {
            for (const item of value) {
                const found = this.findVideoUrl(item);
                if (found) return found;
            }
            return null;
        }

        if (value && typeof value === 'object') {
            const obj = value as Record<string, unknown>;
            const priorityKeys = [
                'noWatermark', 'no_watermark', 'play', 'playAddr',
                'downloadUrl', 'download_url', 'url', 'video', 'data',
            ];

            for (const key of priorityKeys) {
                if (key in obj) {
                    const found = this.findVideoUrl(obj[key]);
                    if (found) return found;
                }
            }

            for (const key of Object.keys(obj)) {
                const found = this.findVideoUrl(obj[key]);
                if (found) return found;
            }
        }

        return null;
    }
}