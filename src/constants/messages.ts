export const MESSAGES = {
  WELCOME_NEW: (name: string) => `¡Hola, *${name}*\\! Tu carpeta personal ya está lista\\.`,
  WELCOME_BACK: (name: string) => `¡Bienvenido de nuevo, *${name}*\\!`,
  START_FOOTER: '\n\nEstos son mis comandos disponibles:\n\n' +
    '/dolar \\[cantidad\\] — Precio o conversión del dólar a COP\n' +
    '/ask \\<pregunta\\> — Pregúntale algo a la IA\n' +
    '/get \\<enlace\\> — Descargar video de TikTok, Instagram o YouTube\n' +
    '/cloud — Explorar tus archivos guardados\n' +
    '/recordatorio \\<frase\\> — Programa recordatorios en lenguaje natural\n' +
    '/help — Ver ayuda completa\n\n' +
    '_También puedes enviarme imágenes, videos, audios y documentos para guardarlos\\._',
  
  GENERIC_ERROR: 'Ocurrió un error inesperado. Por favor intenta de nuevo.',
  UNEXPECTED_ERROR_MD: 'Ocurrió un error inesperado\\. Intenta de nuevo más tarde\\.',
  NEED_REGISTER: 'Primero escribe /start para registrarte\\.',

  // Command: /ask & /ia
  ASK_USAGE: 'Debes escribir una pregunta. Ejemplo: `/ask Cómo hacer un asado?`',
  ASK_TOO_LONG: 'La pregunta es demasiado larga \\(máximo 1000 caracteres\\)\\.',
  ASK_ERROR: 'No pude obtener una respuesta de la IA\\. Intenta de nuevo más tarde\\.',

  // Command: /dolar
  DOLAR_ERROR: 'No pude obtener el valor del dólar\\. Intenta de nuevo más tarde\\.',

  // Command: /get
  GET_DOWNLOADING: 'Descargando video\\.\\.\\.',
  GET_SENDING: 'Enviando video\\.\\.\\.',
  GET_ERROR: 'No pude completar la descarga\\. Intenta de nuevo más tarde\\.',

  // Command: /recordatorio
  REMINDER_USAGE: 'Debes escribir un recordatorio. Ejemplo: `/recordatorio recuérdame revisar el correo mañana a las 8am`',
  REMINDER_NO_CHAT: 'No se pudo determinar el chat de destino.',
  REMINDER_ERROR: 'No pude programar el recordatorio\\. Intenta de nuevo más tarde\\.',

  // Cloud & Files
  CLOUD_EXPIRED: 'Tu sesión de /cloud expiró o se perdió\\. Vuelve a ejecutar /cloud\\.',
  CLOUD_NO_FILES_PAGE: 'Ya no hay archivos en esta página\\. Vuelve a ejecutar /cloud\\.',
  CLOUD_INVALID_RANGE_FORMAT: 'Formato inválido\\. Usa `N-M`, por ejemplo `2-5`\\.',
  CLOUD_NO_MORE_FILES: 'No hay más archivos para mostrar\\.',
  CLOUD_TITLE: '*Tus archivos en la nube*\n\n¿A cuál de tus directorios personales deseas acceder?',

  // Help
  HELP_GUIDE: `*Guía de comandos*

━━━━━━━━━━━━━━━━━━━━
*/start*
Verifica que el bot esté activo y muestra la bienvenida\\.

*/dolar \\[cantidad\\]*
Sin argumentos: muestra el valor del dólar hoy en pesos colombianos\\.
Con un número: convierte esos dólares a pesos colombianos\\.
Ejemplos: \`/dolar\` y \`/dolar 20\`

*/ask \\<pregunta\\>*
Hazle una pregunta a la IA de Gemini y recibe una respuesta breve\\.
Ejemplo: \`/ask Cómo hacer un asado?\`

*/get \\<enlace\\>*
Descarga un video de TikTok, Instagram o YouTube y lo guarda en tu carpeta personal\\.
Ejemplo: \`/get https://vm.tiktok.com/XXXXXXX\`

*/cloud*
Muestra un menú para explorar tus archivos guardados \\(imágenes, videos, audios o documentos\\)\\.
Permite ver cuántos archivos tienes, su peso total, y recibirlos de nuevo en el chat\\.

*/recordatorio \\<mensaje natural\\>*
Programa un recordatorio en lenguaje natural \\(ej: \`/recordatorio revisar el correo mañana a las 8am\`\\)\\.
━━━━━━━━━━━━━━━━━━━━`,
};
