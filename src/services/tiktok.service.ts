import axios from 'axios';

const COBALT_API_URL = 'https://api.cobalt.tools/';
const REQUEST_TIMEOUT_MS = 120_000;

const API_HEADERS = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
};

const DOWNLOAD_HEADERS = {
    'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Referer: 'https://www.tiktok.com/',
};

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
        const cobaltResponse = await axios.post(
            COBALT_API_URL,
            { url: postUrl },
            {
                headers: API_HEADERS,
                timeout: REQUEST_TIMEOUT_MS,
            }
        );

        const data = cobaltResponse.data as {
            status: string;
            url?: string;
            error?: { code: string };
        };

        if (data.status !== 'tunnel' && data.status !== 'redirect') {
            const errorCode = data.error?.code ?? 'unknown';
            throw new Error(`Cobalt API error: ${errorCode}`);
        }

        if (!data.url) {
            throw new Error('Cobalt API no devolvió una URL de descarga.');
        }

        return await fetchBuffer(data.url);
    }
}
