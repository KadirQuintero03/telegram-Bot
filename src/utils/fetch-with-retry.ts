import axios from 'axios';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithRetry(
  url: string,
  retries = 3,
  delay = 3000
): Promise<Buffer> {
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await axios.get<ArrayBuffer>(url, {
        responseType: 'arraybuffer',
        timeout: 50000,
      });
      return Buffer.from(response.data);
    } catch (error: unknown) {
      const isAxios = axios.isAxiosError(error);
      const isTimeout = isAxios && error.code === 'ECONNABORTED';
      const isNetworkError =
        isAxios &&
        (!error.response || (error.response.status >= 500 && error.response.status <= 504));

      if (i < retries && (isTimeout || isNetworkError)) {
        await sleep(delay);
        continue;
      }

      throw error;
    }
  }

  throw new Error('No se pudo descargar el archivo.');
}
