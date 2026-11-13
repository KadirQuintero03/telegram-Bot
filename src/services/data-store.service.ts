import fs from 'fs';
import path from 'path';

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
}

const EMPTY_DATA: DataSchema = {
  recordatorios: [],
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
        const parsed = JSON.parse(raw) as Partial<DataSchema>;

        return {
          recordatorios: parsed.recordatorios ?? [],
        };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      console.error(`[DataStore] No se pudo leer data.json: ${msg}`);
    }
    return structuredClone(EMPTY_DATA);
  }

  private save(): void {
    const tmpFile = `${DATA_FILE}.tmp`;
    try {
      fs.writeFileSync(tmpFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DATA_FILE);
    } catch (err) {
      if (fs.existsSync(tmpFile)) {
        try {
          fs.unlinkSync(tmpFile);
        } catch {}
      }
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
}

export const dataStore = new DataStoreService();
