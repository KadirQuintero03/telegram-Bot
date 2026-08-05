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

// Tiempo de vida del código de acceso y máximo de intentos de verificación,
// para mitigar ataques de fuerza bruta sobre un código de solo 4 dígitos.
const CODE_TTL_MS = 5 * 60 * 1000; // 5 minutos
const MAX_ATTEMPTS = 5;

/**
 * Genera y valida los códigos de acceso de 4 dígitos que le permiten a un
 * usuario de GlowPic (web) iniciar sesión usando su cuenta de Telegram como
 * segundo factor. El código se guarda en memoria (no en disco) por ser un
 * dato temporal y sensible.
 */
export class AccessCodeService {
    private codes = new Map<string, CodeEntry>(); // clave: teléfono normalizado
    private bot: Telegraf<BotContext> | null = null;

    // El bot se inyecta después de crearse (ver server/explorer.server.ts),
    // ya que este servicio se instancia antes de que el bot exista.
    setBot(bot: Telegraf<BotContext>): void {
        this.bot = bot;
    }

    /**
     * Busca al usuario dueño del teléfono, genera un código de 4 dígitos
     * 100% aleatorio y se lo envía por Telegram. Lanza un error descriptivo
     * si el teléfono no está registrado o si el envío falla.
     */
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
                `🔐 Tu código de acceso a GlowPic es: *${code}*\n\nExpira en 5 minutos. Si no fuiste tú, ignora este mensaje.`,
                { parse_mode: 'Markdown' }
            );
        } catch (err) {
            this.codes.delete(phoneKey);
            const msg = err instanceof Error ? err.message : 'Error desconocido';
            throw new Error(`No se pudo enviar el código por Telegram: ${msg}`);
        }

        return { maskedPhone: this.maskPhone(phoneKey) };
    }

    /**
     * Verifica el código ingresado en GlowPic. Devuelve el nombre de la
     * carpeta del usuario (usado luego para restringir qué puede ver en el
     * explorador de archivos). El código es de un solo uso: se elimina tras
     * un intento exitoso, y también tras agotar los intentos permitidos.
     */
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
        // Aleatorio uniforme entre 0000 y 9999, siempre con 4 dígitos.
        const value = Math.floor(Math.random() * 10000);
        return value.toString().padStart(4, '0');
    }

    private maskPhone(digitsOnly: string): string {
        if (digitsOnly.length <= 4) return digitsOnly;
        return `${'*'.repeat(digitsOnly.length - 4)}${digitsOnly.slice(-4)}`;
    }
}

export const accessCodeService = new AccessCodeService();
