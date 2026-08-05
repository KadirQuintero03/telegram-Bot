export interface DolarRate {
    rate: number;
    lastUpdate: string;
}

export interface DolarConversion extends DolarRate {
  usdAmount: number;
  copAmount: number;
}
