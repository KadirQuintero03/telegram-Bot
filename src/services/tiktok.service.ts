import axios from 'axios';
import { TikTokRawItemStruct, TikTokVideoInfo } from '../types/tiktok.types.js';

// ── Headers que imitan un navegador real ───────────────────────────
// TikTok bloquea peticiones sin un User-Agent "creíble". No es una API
// de terceros: simplemente le pedimos la misma página HTML que vería
// cualquier persona al abrir el enlace en su navegador.
const BROWSER_HEADERS = {
    'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
};

const PAGE_TIMEOUT_MS = 15000;
const DOWNLOAD_TIMEOUT_MS = 60000;

export class TikTokService {
    /**
     * Descarga el HTML público del video y extrae:
     * - La URL de descarga sin marca de agua (mejor calidad disponible)
     * - Descripción, autor, duración y portada
     *
     * No usa ninguna API externa de descarga: solo lee el JSON que TikTok
     * embebe en su propia página web (lo mismo que hace el navegador).
     */
    async getVideoInfo(url: string): Promise<TikTokVideoInfo> {
        const html = await this.fetchHtml(url);

        const itemStruct =
            this.extractFromUniversalData(html) ?? this.extractFromSigiState(html);

        if (!itemStruct) {
            throw new Error(
                'No se pudo leer la información del video. El enlace puede ser privado, haber expirado, ' +
                'o TikTok cambió la estructura de su página.'
            );
        }

        const video = itemStruct.video;
        if (!video) {
            throw new Error('El enlace no corresponde a un video válido de TikTok.');
        }

        const downloadUrl = this.pickBestQualityUrl(video);
        if (!downloadUrl) {
            throw new Error('No se encontró una URL de video descargable para este enlace.');
        }

        return {
            id: itemStruct.id ?? video.id ?? 'desconocido',
            description: itemStruct.desc ?? '',
            author: itemStruct.author?.uniqueId ?? itemStruct.author?.nickname ?? 'desconocido',
            durationSeconds: video.duration ?? 0,
            coverUrl: video.cover ?? video.originCover ?? '',
            downloadUrl,
        };
    }

    /**
     * Descarga los bytes reales del video desde el CDN de TikTok.
     * Se necesita el header "Referer" porque el CDN rechaza descargas
     * que no parezcan provenir de tiktok.com.
     */
    async downloadVideoBuffer(downloadUrl: string): Promise<Buffer> {
        const response = await axios.get<ArrayBuffer>(downloadUrl, {
            responseType: 'arraybuffer',
            timeout: DOWNLOAD_TIMEOUT_MS,
            maxRedirects: 5,
            headers: {
                ...BROWSER_HEADERS,
                Referer: 'https://www.tiktok.com/',
            },
        });
        return Buffer.from(response.data);
    }

    // ── Privados ─────────────────────────────────────────────────────

    private async fetchHtml(url: string): Promise<string> {
        // axios sigue automáticamente los redirects de los enlaces cortos
        // (vm.tiktok.com / vt.tiktok.com / tiktok.com/t/...) hasta llegar
        // a la página final del video.
        const response = await axios.get<string>(url, {
            timeout: PAGE_TIMEOUT_MS,
            maxRedirects: 5,
            responseType: 'text',
            headers: BROWSER_HEADERS,
        });
        return response.data;
    }

    // Estructura actual (2023+): <script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">
    private extractFromUniversalData(html: string): TikTokRawItemStruct | null {
        const match = html.match(
            /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/
        );
        if (!match || !match[1]) return null;

        try {
            const json = JSON.parse(match[1]);
            const defaultScope = json?.__DEFAULT_SCOPE__ ?? {};
            const detail = defaultScope['webapp.video-detail'];
            const itemStruct = detail?.itemInfo?.itemStruct;
            return itemStruct ?? null;
        } catch {
            return null;
        }
    }

    // Estructura antigua / variante de fallback: <script id="SIGI_STATE">
    private extractFromSigiState(html: string): TikTokRawItemStruct | null {
        const match = html.match(/<script id="SIGI_STATE"[^>]*>([\s\S]*?)<\/script>/);
        if (!match || !match[1]) return null;

        try {
            const json = JSON.parse(match[1]);
            const itemModule = json?.ItemModule;
            if (!itemModule) return null;
            const firstKey = Object.keys(itemModule)[0];
            return firstKey ? (itemModule[firstKey] as TikTokRawItemStruct) : null;
        } catch {
            return null;
        }
    }

    // Recorre las variantes de calidad (bitrateInfo) y elige la de mayor bitrate.
    // Estas URLs corresponden al "playAddr" (reproducción), que en TikTok no
    // lleva la marca de agua que sí se incrusta en el "downloadAddr" oficial.
    private pickBestQualityUrl(video: NonNullable<TikTokRawItemStruct['video']>): string | null {
        const bitrateInfo = video.bitrateInfo;

        if (Array.isArray(bitrateInfo) && bitrateInfo.length > 0) {
            const best = bitrateInfo.reduce((prev, current) =>
                (current?.Bitrate ?? 0) > (prev?.Bitrate ?? 0) ? current : prev
            );
            const urlList = best?.PlayAddr?.UrlList ?? best?.playAddr?.urlList;
            if (Array.isArray(urlList) && urlList.length > 0) {
                return urlList[0] ?? null;
            }
        }

        return video.playAddr ?? video.play_addr?.url_list?.[0] ?? null;
    }
}