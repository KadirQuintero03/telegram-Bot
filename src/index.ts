import { createBot } from './bot.js';
import { createExplorerServer } from './server/explorer.server.js';

const EXPLORER_PORT = parseInt(process.env['EXPLORER_PORT'] ?? '3000', 10);

// ── Red de seguridad a nivel de proceso ─────────────────────────────
// Un error asíncrono que no sea capturado por Telegraf (bot.catch) o por
// Express podría, si no se maneja, terminar el proceso Node abruptamente.
// Eso, combinado con un gestor de procesos que reinicia automáticamente
// (nodemon en desarrollo, pm2 en producción), puede producir un bucle de
// caídas y reinicios constantes, y cada reinicio puede hacer que Telegram
// reenvíe el mismo update sin confirmar (spam del mismo comando). Por eso
// SOLO registramos el error para diagnóstico, pero jamás cerramos el
// proceso desde aquí.
process.on('unhandledRejection', (reason) => {
  const msg = reason instanceof Error ? reason.stack ?? reason.message : String(reason);
  console.error(`[FATAL-EVITADO] Promesa rechazada sin manejar: ${msg}`);
});

process.on('uncaughtException', (err) => {
  console.error(`[FATAL-EVITADO] Excepción no capturada: ${err.stack ?? err.message}`);
});

async function main(): Promise<void> {
  console.info('[INFO] Iniciando bot de Telegram...');

  const bot = createBot();

  // ── Menú de comandos: aparece como lista al escribir "/" en el chat ──
  await bot.telegram.setMyCommands([
    { command: 'start', description: 'Registrarte y ver bienvenida' },
    { command: 'help', description: 'Ver la guía completa de comandos' },
    { command: 'clima', description: 'Clima en tiempo real de una ciudad' },
    { command: 'tra', description: 'Traducir un texto al español' },
    { command: 'dolar', description: 'Ver o convertir el precio del dólar a COP' },
    // { command: 'tran', description: 'Transcribir un audio' },
    // { command: 'resume', description: 'Resumir texto, audio o imagen' },
    { command: 'ask', description: 'Preguntarle algo a la IA' },
    { command: 'get', description: 'Descargar video (TikTok, Instagram, YouTube)' },
    { command: 'cloud', description: 'Explorar tus archivos guardados' },
    { command: 'web', description: 'Vincular tu teléfono y acceder a GlowPic' },
    // { command: 'email', description: 'Enviar archivos por correo' },
    // { command: 'borrar', description: 'Eliminar mensajes en grupos (admins)' },
  ]);

  // ── Servidor HTTP para que GlowPic (frontend) explore los archivos ──
  // Se le pasa el bot para poder enviar los códigos de acceso de /auth/*.
  const explorerApp = createExplorerServer(bot);
  const explorerHttpServer = explorerApp.listen(EXPLORER_PORT, () => {
    console.info(`[INFO] ✅ Explorer server escuchando en http://localhost:${EXPLORER_PORT}`);
  });

  // Si el puerto ya está en uso (u otro error de red), Node emitiría un
  // evento 'error' sin manejar y tumbaría el proceso. Lo registramos en
  // vez de dejar que crashee todo el bot.
  explorerHttpServer.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `[ERROR] El puerto ${EXPLORER_PORT} ya está en uso. El explorer server (GlowPic) no pudo iniciarse, pero el bot de Telegram seguirá funcionando con normalidad.`
      );
    } else {
      console.error(`[ERROR] Explorer server: ${err.message}`);
    }
  });

  // Manejo de señales del SO para apagado limpio
  process.once('SIGINT', () => {
    console.info('[INFO] SIGINT recibido. Deteniendo bot...');
    bot.stop('SIGINT');
  });
  process.once('SIGTERM', () => {
    console.info('[INFO] SIGTERM recibido. Deteniendo bot...');
    bot.stop('SIGTERM');
  });

  // Lanzar el bot
  await bot.launch();

  const botInfo = await bot.telegram.getMe();
  console.info(`[INFO] ✅ Bot iniciado correctamente: @${botInfo.username} (ID: ${botInfo.id})`);
}

main().catch((err) => {
  console.error('[FATAL] El bot no pudo iniciarse:', err);
  process.exit(1);
});