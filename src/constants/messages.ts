export const MESSAGES = {
  WELCOME_NEW: (name: string) => `¡Hola, *${name}*\\! Tu carpeta personal ya está lista\\.`,
  WELCOME_BACK: (name: string) => `¡Bienvenido de nuevo, *${name}*\\!`,
  START_FOOTER: '\n\nEstos son mis comandos disponibles:\n\n' +
    '/tra \\<texto\\> — Traducción al español \\(también respondiendo mensajes\\)\n' +
    '/dolar \\[cantidad\\] — Precio o conversión del dólar a COP\n' +
    '/ask \\<pregunta\\> — Pregúntale algo a la IA\n' +
    '/recordatorio \\<frase\\> — Programa recordatorios en lenguaje natural\n' +
    '/gasto \\<monto\\> \\<desc\\> — Registra un gasto en pesos colombianos\n' +
    '/gasto_resumen — Resumen de gastos del mes en curso\n' +
    '/estado — Métricas del sistema\n' +
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

  // Command: /tra
  TRA_USAGE: 'El mensaje al que respondiste no tiene texto para traducir\\.',
  TRA_ERROR: 'No pude traducir el texto\\. Intenta de nuevo más tarde\\.',

  // Command: /recordatorio
  REMINDER_USAGE: 'Debes escribir un recordatorio. Ejemplo: `/recordatorio recuérdame revisar el correo mañana a las 8am`',
  REMINDER_NO_CHAT: 'No se pudo determinar el chat de destino.',
  REMINDER_ERROR: 'No pude programar el recordatorio\\. Intenta de nuevo más tarde\\.',

  // Command: /gasto
  GASTO_USAGE: 'Describe tu gasto en lenguaje natural. Ejemplo: `/gasto me gaste 15000 en gasolina el 20 de agosto de 2026`',
  GASTO_PARSE_ERROR: 'No pude interpretar el gasto. Ejemplo: `/gasto me gaste 15000 en gasolina el 20 de agosto de 2026`',
  GASTO_ERROR: 'No pude registrar el gasto\\. Intenta de nuevo más tarde\\.',
  GASTO_RESUMEN_NO_CHAT: 'No se pudo determinar el chat.',
  GASTO_RESUMEN_EMPTY: (mes: string) => `No tienes gastos registrados en lo que va de *${mes}*\\.`,

  // Command: /estado
  ESTADO_ERROR: 'No pude obtener el estado del sistema\\. Intenta de nuevo más tarde\\.',

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
Verifica que el bot esté activo y muestra bienvenida\\.

*/tra \\<texto\\>*
Traduce cualquier texto al español latinoamericano\\.
Detecta el idioma automáticamente\\.
Ejemplo: \`/tra Hello, how are you?\`
También puedes *responder* a un mensaje de otro participante con \`/tra\` \\(sin texto adicional\\) y el bot detecta el idioma y traduce ese mensaje\\.

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

*/gasto \\<cantidad\\> \\<descripción\\>*
Registra un gasto en *pesos colombianos \\(COP\\)* y lo clasifica automáticamente en una categoría\\.
Ejemplo: \`/gasto 15000 almuerzo\`

*/gasto_resumen*
Muestra el resumen de tus gastos de *lo que va del mes en curso*\\.
Además recibirás resúmenes automáticos: al final de cada semana del mes, cada día 1 del mes y cada 1 de enero\\.

*/estado*
Muestra métricas del sistema \\(CPU, RAM, disco\\)\\.
━━━━━━━━━━━━━━━━━━━━`,
};
