import axios from 'axios';
import TiktokDL from '@tobyg74/tiktok-api-dl';

const REQUEST_TIMEOUT_MS = 60000;

const DOWNLOAD_HEADERS = {
    'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Referer: 'https://www.tiktok.com/',
};

/** Extrae la mejor URL de video (sin marca de agua si es posible) de una respuesta de tiktok-api-dl */
function extractVideoUrl(response: any): string | null {
    if (!response || response.status !== 'success' || !response.result) {
        return null;
    }

    const result = response.result;

    // v1 (TiktokAPI) y v2 (SSSTik) exponen result.video.{downloadAddr,playAddr}
    const fromVideo =
        result.video?.downloadAddr?.[0] ||
        result.video?.playAddr?.[0];
    if (fromVideo) return fromVideo;

    // v3 (MusicalDown) y algunos formatos exponen campos planos
    const flat =
        result.videoHD ||
        result.videoSD ||
        result.videoWatermark ||
        result.direct;
    if (flat) return flat;

    return null;
}

async function fetchBuffer(url: string): Promise<Buffer> {
    const response = await axios.get<ArrayBuffer>(url, {
        responseType: 'arraybuffer',
        timeout: REQUEST_TIMEOUT_MS,
        maxRedirects: 5,
        headers: DOWNLOAD_HEADERS,
    });
    return Buffer.from(response.data);
}

export class TikTokService {
    async downloadVideo(postUrl: string): Promise<Buffer> {
        const versions: Array<'v1' | 'v2' | 'v3'> = ['v1', 'v2', 'v3'];
        const errors: string[] = [];

        for (const version of versions) {
            try {
                const response = await TiktokDL.Downloader(postUrl, { version });
                const videoUrl = extractVideoUrl(response);

                if (!videoUrl) {
                    errors.push(`${version}: ${response?.message ?? 'sin URL de video en la respuesta'}`);
                    continue;
                }

                return await fetchBuffer(videoUrl);
            } catch (error) {
                const msg = error instanceof Error ? error.message : 'Error desconocido';
                errors.push(`${version}: ${msg}`);
            }
        }

        throw new Error(
            `No se pudo descargar el video de TikTok con ningún método disponible.\n${errors.join('\n')}`
        );
    }
}