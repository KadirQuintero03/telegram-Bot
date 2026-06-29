import axios from 'axios';
import { config } from '../config/env.js';

const REQUEST_TIMEOUT_MS = 60_000;

export class InstagramService {
    async downloadVideo(postUrl: string): Promise<Buffer> {
        const baseUrl = config.instagramDownloaderBaseUrl;
        if (!baseUrl) {
            throw new Error('Falta configurar INSTAGRAM_DOWNLOADER_BASE_URL en el .env.');
        }

        const endpoint = `${baseUrl.replace(/\/+$/, '')}/api/v1/download`;

        const response = await axios.get(endpoint, {
            params: { postUrl },
            responseType: 'arraybuffer',
            timeout: REQUEST_TIMEOUT_MS,
            maxRedirects: 5,
        });

        const buffer = Buffer.from(response.data);
        if (buffer.length < 1000) {
            throw new Error('La respuesta del servicio de descarga parece vacía o inválida.');
        }

        return buffer;
    }
}