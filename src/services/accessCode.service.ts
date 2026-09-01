import { Telegraf } from 'telegraf';
import { BotContext } from '../types/bot.types.js';
import { userRegistry } from './userRegistry.service.js';

interface CodeEntry {
    code: string;
    telegramId: number;
    folderName: string;
    expiresAt: number;
    attempts: number;
}

const CODE_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export class AccessCodeService {
    private codes = new Map<string, CodeEntry>();
    private bot: Telegraf<BotContext> | null = null;



    setBot(bot: Telegraf<BotContext>): void {
        this.bot = bot;
    }

        async requestCode(rawPhone: string): Promise<{ maskedPhone: string }> {
        if (!this.bot) {
            throw new Error('El servicio de autenticación no está disponible en este momento.');
        }

        const user = userRegistry.findByPhone(rawPhone);
        if (!user) {
            throw new Error(
                'Este número no está vinculado a ninguna cuenta de Telegram. Usa /web en el bot para vincularlo.'
            );
        }

        const code = this.generateCode();
        const phoneKey = userRegistry.normalizePhone(rawPhone);

        this.codes.set(phoneKey, {
            code,
            telegramId: user.telegramId,
            folderName: user.folderName,
            expiresAt: Date.now() + CODE_TTL_MS,
            attempts: 0,
        });

        try {
            await this.bot.telegram.sendMessage(
                user.telegramId,
                `Tu código de acceso a GlowPic es: *${code}*\n\nExpira en 5 minutos. Si no fuiste tú, ignora este mensaje.`,
                { parse_mode: 'Markdown' }
            );
        } catch (err) {
            this.codes.delete(phoneKey);
            const msg = err instanceof Error ? err.message : 'Error desconocido';
            throw new Error(`No se pudo enviar el código por Telegram: ${msg}`);
        }

        return { maskedPhone: this.maskPhone(phoneKey) };
    }

        verifyCode(rawPhone: string, code: string): { folderName: string } {
        const phoneKey = userRegistry.normalizePhone(rawPhone);
        const entry = this.codes.get(phoneKey);

        if (!entry) {
            throw new Error('No hay un código pendiente para este número. Solicita uno nuevo.');
        }

        if (Date.now() > entry.expiresAt) {
            this.codes.delete(phoneKey);
            throw new Error('El código expiró. Solicita uno nuevo.');
        }

        entry.attempts += 1;
        if (entry.attempts > MAX_ATTEMPTS) {
            this.codes.delete(phoneKey);
            throw new Error('Demasiados intentos fallidos. Solicita un nuevo código.');
        }

        if (entry.code !== code.trim()) {
            throw new Error('El código ingresado es incorrecto.');
        }

        this.codes.delete(phoneKey);
        return { folderName: entry.folderName };
    }

    private generateCode(): string {

        const value = Math.floor(Math.random() * 10000);
        return value.toString().padStart(4, '0');
    }

    private maskPhone(digitsOnly: string): string {
        if (digitsOnly.length <= 4) return digitsOnly;
        return `${'*'.repeat(digitsOnly.length - 4)}${digitsOnly.slice(-4)}`;
    }
}

export const accessCodeService = new AccessCodeService();
