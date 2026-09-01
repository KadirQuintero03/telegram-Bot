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

export interface Gasto {
    id: string;
    chatId: number;
    monto: number;
    descripcion: string;
    categoria: string;
    fecha: string;
}

export interface DataSchema {
    recordatorios: Reminder[];
    gastos: Gasto[];
}

const EMPTY_DATA: DataSchema = {
    recordatorios: [],
    gastos: [],
};

class DataStoreService {
    private data: DataSchema;

    constructor() {
        this.data = this.load();
    }

    /** Carga data.json desde disco o devuelve estructura vacía si falla. */
    private load(): DataSchema {
        try {
            if (fs.existsSync(DATA_FILE)) {
                const raw = fs.readFileSync(DATA_FILE, 'utf-8');
                const parsed = JSON.parse(raw) as DataSchema;
                return {
                    recordatorios: parsed.recordatorios ?? [],
                    gastos: parsed.gastos ?? [],
                };
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Error desconocido';
            console.error(`[DataStore] No se pudo leer data.json: ${msg}`);
        }
        return structuredClone(EMPTY_DATA);
    }

    /** Persiste el estado actual en data.json. */
    private save(): void {
        try {
            fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Error desconocido';
            console.error(`[DataStore] No se pudo guardar data.json: ${msg}`);
        }
    }

    /** Devuelve todos los recordatorios almacenados. */
    getRecordatorios(): Reminder[] {
        return this.data.recordatorios;
    }

    /** Agrega un recordatorio y persiste los cambios. */
    addRecordatorio(reminder: Reminder): void {
        this.data.recordatorios.push(reminder);
        this.save();
    }

    /** Marca un recordatorio como ya disparado dado su id. */
    markRecordatorioFired(id: string): void {
        const reminder = this.data.recordatorios.find((r) => r.id === id);
        if (reminder) {
            reminder.fired = true;
            this.save();
        }
    }

    /** Devuelve todos los gastos almacenados. */
    getGastos(): Gasto[] {
        return this.data.gastos;
    }

    /** Agrega un gasto y persiste los cambios. */
    addGasto(gasto: Gasto): void {
        this.data.gastos.push(gasto);
        this.save();
    }
}

export const dataStore = new DataStoreService();
