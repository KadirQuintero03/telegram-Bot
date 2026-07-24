export interface DolarRate {
  /** Cuántos pesos colombianos (COP) equivalen a 1 dólar (USD) */
  rate: number;
  /** Fecha/hora de la última actualización de la tasa, según la API */
  lastUpdate: string;
}

export interface DolarConversion extends DolarRate {
  usdAmount: number;
  copAmount: number;
}
