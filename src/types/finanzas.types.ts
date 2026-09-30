export type TransactionType = 'gasto' | 'ingreso';

export interface FinanzaTransaction {
  id: string;
  telegramId: number;
  chatId: number;
  usuario: string;
  tipo: TransactionType;
  monto: number;
  categoria: string;
  descripcion: string;
  fecha: string; // Formato DD/MM/AAAA
  createdAt: string; // ISO
}

export interface UserFinanceProfile {
  telegramId: number;
  usuario: string;
  balance: number; // Saldo actual en COP
  updatedAt: string;
}

export type FinanzaSessionStep = 'awaiting_gasto_text' | 'awaiting_ingreso_text' | 'awaiting_voice';

export interface FinanzaSessionData {
  step: FinanzaSessionStep | null;
  startedAt: number;
}
