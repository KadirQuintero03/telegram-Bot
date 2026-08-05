import { Telegraf } from 'telegraf';
import { BotContext } from '../types/bot.types.js';
import { commandTrigger } from '../utils/commandMatcher.js';
import { deleteCommandMessage } from '../utils/telegramHelpers.js';

export function registerHelpCommand(bot: Telegraf<BotContext>): void {
  bot.hears(commandTrigger('help'), async (ctx) => {
    const message =
      `📖 *Guía de comandos*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🚀 */start*\n` +
      `Verifica que el bot esté activo y muestra bienvenida\\.\n\n` +
      `🌤 */clima \\<ciudad\\>*\n` +
      `Consulta el clima actual de una ciudad\\.\n` +
      `📌 Ejemplo: \`/clima Bogotá\`\n\n` +
      `🌐 */tra \\<texto\\>*\n` +
      `Traduce cualquier texto al español latinoamericano\\.\n` +
      `Detecta el idioma automáticamente\\.\n` +
      `📌 Ejemplo: \`/tra Hello, how are you?\`\n` +
      `📌 También puedes *responder* a un mensaje de otro participante con \`/tra\` \\(sin texto adicional\\) y el bot detecta el idioma y traduce ese mensaje\\.\n\n` +
      `💵 */dolar \\[cantidad\\]*\n` +
      `Sin argumentos: muestra el valor del dólar hoy en pesos colombianos\\.\n` +
      `Con un número: convierte esos dólares a pesos colombianos\\.\n` +
      `📌 Ejemplos: \`/dolar\` y \`/dolar 20\`\n\n` +
      `🎙 */tran*\n` +
      `Responde a una nota de voz o audio con \`/tran\` y el bot transcribe lo que dice\\.\n\n` +
      `📝 */resume*\n` +
      `Responde a un texto, audio o imagen con \`/resume\` y el bot te da un resumen breve del contenido\\.\n\n` +
      `🤖 */ask \\<pregunta\\>*\n` +
      `Hazle una pregunta a la IA de Gemini y recibe una respuesta breve\\.\n` +
      `📌 Ejemplo: \`/ask Cómo hacer un asado?\`\n\n` +
      `🗑 */borrar \\<N\\>*\n` +
      `Elimina los últimos N mensajes del grupo\\.\n` +
      `Solo disponible para administradores en grupos\\.\n` +
      `📌 Ejemplo: \`/borrar 10\`\n\n` +
      `📥 */get \\<enlace\\>*\n` +
      `Descarga un video de TikTok, Instagram o YouTube y lo guarda en tu carpeta personal\\.\n` +
      `📌 Ejemplo: \`/get https://vm.tiktok.com/XXXXXXX\`\n\n` +
      `☁️ */cloud*\n` +
      `Muestra un menú para explorar tus archivos guardados \\(imágenes, videos, audios o documentos\\)\\.\n` +
      `Permite ver cuántos archivos tienes, su peso total, y recibirlos de nuevo en el chat\\.\n\n` +
      `📧 */email*\n` +
      `Inicia el flujo para enviar un archivo por correo\\.\n\n` +
      `🌐 */web*\n` +
      `Vincula tu número de teléfono para poder iniciar sesión en GlowPic \\(la primera vez te lo pedirá; luego te dará el enlace directo\\)\\.\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `_Rango de borrado: 1 a 100 mensajes_`;

    await ctx.reply(message, { parse_mode: 'MarkdownV2' });
    await deleteCommandMessage(ctx);
  });
}
