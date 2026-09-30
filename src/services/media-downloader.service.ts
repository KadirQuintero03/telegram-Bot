import { config } from '../config/env.js';
import { fetchWithRetry } from '../utils/fetch-with-retry.js';

export async function downloadSocialVideo(postUrl: string): Promise<Buffer> {
  if (!config.downloaderApiUrl) {
    throw new Error('Falta configurar DOWNLOADER_API en el .env.');
  }

  const endpoint = `${config.downloaderApiUrl.replace(/\/+$/, '')}/api/v1/download?postUrl=${encodeURIComponent(postUrl)}`;
  return fetchWithRetry(endpoint);
}

export class TikTokService {
  downloadVideo(postUrl: string): Promise<Buffer> {
    return downloadSocialVideo(postUrl);
  }
}

export class InstagramService {
  downloadVideo(postUrl: string): Promise<Buffer> {
    return downloadSocialVideo(postUrl);
  }
}

export class YouTubeService {
  downloadVideo(postUrl: string): Promise<Buffer> {
    return downloadSocialVideo(postUrl);
  }
}
