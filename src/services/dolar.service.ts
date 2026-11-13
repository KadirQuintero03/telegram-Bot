import axios from 'axios';
import { DolarConversion, DolarRate } from '../types/dolar.types.js';

const EXCHANGE_RATE_URL = 'https://open.er-api.com/v6/latest/USD';
const TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutos de caché en memoria

interface ExchangeRateApiResponse {
  result: string;
  time_last_update_utc?: string;
  rates?: Record<string, number>;
}

export class DolarService {
  private cachedRate: DolarRate | null = null;
  private cacheTimestamp = 0;

  async getRate(): Promise<DolarRate> {
    const now = Date.now();
    if (this.cachedRate && now - this.cacheTimestamp < CACHE_TTL_MS) {
      return this.cachedRate;
    }

    const response = await axios.get<ExchangeRateApiResponse>(EXCHANGE_RATE_URL, {
      timeout: TIMEOUT_MS,
    });

    const data = response.data;
    const copRate = data.rates?.['COP'];

    if (data.result !== 'success' || !copRate) {
      // Si la API falla pero tenemos caché previo (aunque sea viejo), usamos el anterior como fallback
      if (this.cachedRate) {
        return this.cachedRate;
      }
      throw new Error('No se pudo obtener la tasa de cambio del dólar en este momento.');
    }

    const rateResult: DolarRate = {
      rate: copRate,
      lastUpdate: data.time_last_update_utc ?? 'desconocida',
    };

    this.cachedRate = rateResult;
    this.cacheTimestamp = now;

    return rateResult;
  }

  async convert(usdAmount: number): Promise<DolarConversion> {
    const { rate, lastUpdate } = await this.getRate();
    return {
      rate,
      lastUpdate,
      usdAmount,
      copAmount: usdAmount * rate,
    };
  }
}
