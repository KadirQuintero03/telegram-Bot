import { config } from '../config/env.js';
import { fetchWithRetry } from '../utils/fetchWithRetry.js';

export class InstagramService {
    async downloadVideo(postUrl: string): Promise<Buffer> {
        if (!config.downloaderApiUrl) {
            throw new Error('Falta configurar DOWNLOADER_API en el .env.');
        }

        const endpoint = `${config.downloaderApiUrl.replace(/\/+$/, '')}/api/v1/download?postUrl=${encodeURIComponent(postUrl)}`;

        return fetchWithRetry(endpoint);
    }
}