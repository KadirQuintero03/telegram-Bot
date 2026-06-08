import axios from 'axios';
import { GeocodingResponse, WeatherResponse, WeatherData } from '../types/weather.types.js';
import { MemoryCache } from '../utils/cache.js';
import { config } from '../config/env.js';

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const TIMEOUT_MS = 5000;

const weatherDescriptions: Record<number, string> = {
  0: 'Despejado',
  1: 'Mayormente despejado',
  2: 'Parcialmente nublado',
  3: 'Nublado',
  45: 'Niebla',
  48: 'Niebla con escarcha',
  51: 'Llovizna ligera',
  53: 'Llovizna moderada',
  55: 'Llovizna densa',
  61: 'Lluvia ligera',
  63: 'Lluvia moderada',
  65: 'Lluvia intensa',
  71: 'Nieve ligera',
  73: 'Nieve moderada',
  75: 'Nieve intensa',
  80: 'Chubascos ligeros',
  81: 'Chubascos moderados',
  82: 'Chubascos violentos',
  95: 'Tormenta eléctrica',
  99: 'Tormenta con granizo',
};

export class WeatherService {
  private cache: MemoryCache<WeatherData>;

  constructor() {
    this.cache = new MemoryCache<WeatherData>(config.weatherCacheTtlMinutes);
  }

  async getWeather(cityName: string): Promise<WeatherData> {
    const cacheKey = cityName.toLowerCase().trim();

    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.info(`[WeatherService] Cache hit para: ${cityName}`);
      return cached;
    }

    // 1. Geocodificación
    const geoResponse = await axios.get<GeocodingResponse>(GEOCODING_URL, {
      params: { name: cityName, count: 1, language: 'es', format: 'json' },
      timeout: TIMEOUT_MS,
    });

    const results = geoResponse.data.results;
    if (!results || results.length === 0) {
      throw new Error(`No se encontró la ciudad: "${cityName}"`);
    }

    const location = results[0];
    if (!location) {
      throw new Error(`No se encontró la ciudad: "${cityName}"`);
    }

    // 2. Forecast
    const weatherResponse = await axios.get<WeatherResponse>(FORECAST_URL, {
      params: {
        latitude: location.latitude,
        longitude: location.longitude,
        current: 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weathercode',
        wind_speed_unit: 'kmh',
        timezone: 'auto',
      },
      timeout: TIMEOUT_MS,
    });

    const current = weatherResponse.data.current;
    const units = weatherResponse.data.current_units;
    const wcode = current.weathercode;
    const description = weatherDescriptions[wcode] ?? 'Condición desconocida';

    const weatherData: WeatherData = {
      city: location.name,
      country: location.country,
      temperature: Math.round(current.temperature_2m),
      feelsLike: Math.round(current.apparent_temperature),
      humidity: current.relative_humidity_2m,
      windSpeed: Math.round(current.wind_speed_10m),
      description,
      unit: units.temperature_2m,
    };

    this.cache.set(cacheKey, weatherData);
    return weatherData;
  }
}
