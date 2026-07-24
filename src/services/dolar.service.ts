import axios from 'axios';
import { DolarConversion, DolarRate } from '../types/dolar.types.js';

// API gratuita, sin necesidad de API key, actualizada aproximadamente cada 24h.
// Documentación: https://www.exchangerate-api.com/docs/free
const EXCHANGE_RATE_URL = 'https://open.er-api.com/v6/latest/USD';
const TIMEOUT_MS = 8000;

interface ExchangeRateApiResponse {
  result: string;
  time_last_update_utc?: string;
  rates?: Record<string, number>;
}

export class DolarService {
  /** Obtiene cuántos pesos colombianos equivalen actualmente a 1 USD. */
  async getRate(): Promise<DolarRate> {
    const response = await axios.get<ExchangeRateApiResponse>(EXCHANGE_RATE_URL, {
      timeout: TIMEOUT_MS,
    });

    const data = response.data;
    const copRate = data.rates?.['COP'];

    if (data.result !== 'success' || !copRate) {
      throw new Error('No se pudo obtener la tasa de cambio del dólar en este momento.');
    }

    return {
      rate: copRate,
      lastUpdate: data.time_last_update_utc ?? 'desconocida',
    };
  }

  /** Convierte una cantidad de USD a COP usando la tasa actual. */
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
