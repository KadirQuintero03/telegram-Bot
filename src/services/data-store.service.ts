import fs from 'fs';
import path from 'path';
import { userRegistry } from './user-registry.service.js';
import { FinanzaTransaction, UserFinanceProfile } from '../types/finanzas.types.js';
import { normalizeDateDDMMAAAA } from '../utils/finanzas.js';

const DATA_FILE = path.resolve(process.cwd(), 'data.json');

export interface Reminder {
  id: string;
  chatId: number;
  task: string;
  date: string;
  time: string;
  createdAt: string;
  fired: boolean;
}

export interface DataSchema {
  recordatorios: Reminder[];
  finanzas: FinanzaTransaction[];
  profiles: Record<number, UserFinanceProfile>;
}

const EMPTY_DATA: DataSchema = {
  recordatorios: [],
  finanzas: [],
  profiles: {},
};

class DataStoreService {
  private data: DataSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): DataSchema {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as Partial<DataSchema> & { gastos?: any[] };

        let finanzas: FinanzaTransaction[] = parsed.finanzas ?? [];
        let profiles: Record<number, UserFinanceProfile> = parsed.profiles ?? {};
        let changed = false;

        // Migración de datos legacy (gastos -> finanzas)
        if (Array.isArray(parsed.gastos) && parsed.gastos.length > 0) {
          for (const oldGasto of parsed.gastos) {
            const telegramId = oldGasto.chatId ?? 0;
            const usuario = oldGasto.usuario || userRegistry.getUsername(telegramId) || 'Desconocido';
            const fechaNorm = normalizeDateDDMMAAAA(oldGasto.fecha);

            const tx: FinanzaTransaction = {
              id: oldGasto.id || String(Date.now()),
              telegramId,
              chatId: oldGasto.chatId ?? 0,
              usuario,
              tipo: 'gasto',
              monto: Number(oldGasto.monto) || 0,
              categoria: oldGasto.categoria || 'Otros',
              descripcion: oldGasto.descripcion || 'Gasto registrado',
              fecha: fechaNorm,
              createdAt: oldGasto.fecha || new Date().toISOString(),
            };
            finanzas.push(tx);
          }
          changed = true;
        }

        // Recalcular perfiles si faltan
        for (const tx of finanzas) {
          if (!profiles[tx.telegramId]) {
            profiles[tx.telegramId] = {
              telegramId: tx.telegramId,
              usuario: tx.usuario,
              balance: 0,
              updatedAt: new Date().toISOString(),
            };
          }
        }

        // Recalcular balances
        for (const pid of Object.keys(profiles)) {
          const id = Number(pid);
          const userTx = finanzas.filter((t) => t.telegramId === id);
          let bal = 0;
          for (const t of userTx) {
            if (t.tipo === 'ingreso') bal += t.monto;
            if (t.tipo === 'gasto') bal -= t.monto;
          }
          profiles[id]!.balance = bal;
        }

        const data: DataSchema = {
          recordatorios: parsed.recordatorios ?? [],
          finanzas,
          profiles,
        };

        if (changed) {
          this.data = data;
          this.save();
        }

        return data;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      console.error(`[DataStore] No se pudo leer data.json: ${msg}`);
    }
    return structuredClone(EMPTY_DATA);
  }

  private save(): void {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      console.error(`[DataStore] No se pudo guardar data.json: ${msg}`);
    }
  }

  getRecordatorios(): Reminder[] {
    return this.data.recordatorios;
  }

  addRecordatorio(reminder: Reminder): void {
    this.data.recordatorios.push(reminder);
    this.save();
  }

  markRecordatorioFired(id: string): void {
    const reminder = this.data.recordatorios.find((r) => r.id === id);
    if (reminder) {
      reminder.fired = true;
      this.save();
    }
  }

  getProfile(telegramId: number, usuario: string): UserFinanceProfile {
    let profile = this.data.profiles[telegramId];
    if (!profile) {
      profile = {
        telegramId,
        usuario,
        balance: 0,
        updatedAt: new Date().toISOString(),
      };
      this.data.profiles[telegramId] = profile;
      this.save();
    } else if (usuario && profile.usuario !== usuario) {
      profile.usuario = usuario;
      this.save();
    }
    return profile;
  }

  addTransaction(tx: FinanzaTransaction): UserFinanceProfile {
    this.data.finanzas.push(tx);

    const profile = this.getProfile(tx.telegramId, tx.usuario);
    if (tx.tipo === 'ingreso') {
      profile.balance += tx.monto;
    } else if (tx.tipo === 'gasto') {
      profile.balance -= tx.monto;
    }
    profile.updatedAt = new Date().toISOString();

    this.save();
    return profile;
  }

  getUserTransactions(telegramId: number): FinanzaTransaction[] {
    return this.data.finanzas.filter((tx) => tx.telegramId === telegramId);
  }
}

export const dataStore = new DataStoreService();
