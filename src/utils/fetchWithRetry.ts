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
        } catch (error: any) {
            const isTimeout = error.code === 'ECONNABORTED';

            if (i < retries && isTimeout) {
                await sleep(delay);
                continue;
            }

            throw error;
        }
    }

    throw new Error('No se pudo descargar el archivo.');
}