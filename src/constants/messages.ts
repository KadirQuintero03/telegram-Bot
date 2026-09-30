export const MESSAGES = {
  WELCOME_NEW: (name: string) => `¡Hola, *${name}*\\! Tu carpeta personal ya está lista\\.`,
  WELCOME_BACK: (name: string) => `¡Bienvenido de nuevo, *${name}*\\!`,
  START_FOOTER: '\n\nEstos son mis comandos disponibles:\n\n' +
    '/tra \\<texto\\> — Traducción al español \\(también respondiendo mensajes\\)\n' +
    '/dolar \\[cantidad\\] — Precio o conversión del dólar a COP\n' +
    '/ask \\<pregunta\\> — Pregúntale algo a la IA\n' +
    '/recordatorio \\<frase\\> — Programa recordatorios en lenguaje natural\n' +
    '/finanza — Registra tus ingresos o gastos \\(texto o voz\\)\n' +
    '/resumen_finanza — Resúmenes semanales, mensuales, anuales o por categoría\n' +
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

  // Command: /finanza
  FINANZA_PROMPT: '💳 *Gestión de Finanzas Personales*\n\n¿Qué deseas ingresar el día de hoy?',
  FINANZA_BTN_GASTO: '🔴 Gasto',
  FINANZA_BTN_INGRESO: '🟢 Ingreso',
  FINANZA_BTN_VOICE: '🎙️ Registro por voz',
  
  FINANZA_GASTO_INSTR:
    '🔴 *Registro de Gasto*\n\n' +
    'Escribe los datos de tu gasto en este chat con la siguiente estructura:\n' +
    '`Monto Categoría Descripción [Fecha]`\n\n' +
    '*Ejemplos:*\n' +
    '• `130000 Transporte Tanqueando el carro con gasolina`\n' +
    '• `45000 Comida Almuerzo de trabajo 03/08/2026`',

  FINANZA_INGRESO_INSTR:
    '🟢 *Registro de Ingreso*\n\n' +
    'Escribe los datos de tu ingreso en este chat con la siguiente estructura:\n' +
    '`Monto Categoría Descripción [Fecha]`\n\n' +
    '*Ejemplos:*\n' +
    '• `500000 Trabajo me pagaron la quincena de este mes`\n' +
    '• `150000 Ventas Venta de bicicleta 03/08/2026`',

  FINANZA_VOICE_INSTR:
    '🎙️ *Registro por Voz*\n\n' +
    'Envíame un audio diciendo qué transacción deseas registrar\\. Por ejemplo:\n\n' +
    '1️⃣ *"Hoy gasté 130000 pesos en transporte tanqueando el carro"*\n' +
    '2️⃣ *"Hoy recibí 500000 pesos de trabajo por mi quincena"*\n\n' +
    '_La IA de Gemini analizará tu voz y registrará automáticamente la finanza\\._',

  FINANZA_PARSE_ERROR: 'No pude interpretar la transacción\\. Revisa el formato e intenta de nuevo\\. Ejemplo: `130000 Transporte Tanqueando el carro`',
  FINANZA_VOICE_ERROR: 'No logré entender el audio o extraer el monto con claridad\\. Intenta enviar una nota de voz más clara\\.',
  FINANZA_ERROR: 'Ocurrió un problema al registrar la finanza\\. Intenta de nuevo más tarde\\.',

  // Command: /resumen_finanza
  RESUMEN_FINANZA_TITLE:
    '📊 *Resumen de Finanzas Personales*\n\n' +
    'Selecciona una de las siguientes opciones para consultar el estado de tus finanzas:\n\n' +
    '• *Resumen Semanal*: Muestra lo ingresado y gastado en los últimos 7 días\\.\n' +
    '• *Resumen Mensual*: Muestra el balance y desglose del mes en curso\\.\n' +
    '• *Resumen Anual*: Muestra el resumen global desglosado mes a mes del año actual\\.\n' +
    '• *Resumen Categoría*: Muestra el desglose acumulado por cada categoría\\.',
  
  RESUMEN_BTN_SEMANAL: '📅 Resumen Semanal',
  RESUMEN_BTN_MENSUAL: '🗓️ Resumen Mensual',
  RESUMEN_BTN_ANUAL: '📊 Resumen Anual',
  RESUMEN_BTN_CATEGORIA: '📂 Resumen Categoría',

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
Verifica que el bot esté activo y muestra la bienvenida\\.

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

*/finanza*
Registra un ingreso o gasto mediante botones interactivos, texto o nota de voz con IA\\.

*/resumen_finanza*
Muestra resúmenes de finanzas semanal, mensual, anual o por categoría\\.

*/estado*
Muestra métricas del sistema \\(CPU, RAM, disco\\)\\.
━━━━━━━━━━━━━━━━━━━━`,
};
