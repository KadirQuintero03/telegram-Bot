import { createBot } from './bot.js';
import { createExplorerServer } from './server/explorer.server.js';

const EXPLORER_PORT = parseInt(process.env['EXPLORER_PORT'] ?? '3000', 10);

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


  await bot.telegram.setMyCommands([
    { command: 'start', description: 'Registrarte y ver bienvenida' },
    { command: 'help', description: 'Ver la guía completa de comandos' },
    { command: 'clima', description: 'Clima en tiempo real de una ciudad' },
    { command: 'tra', description: 'Traducir un texto al español' },
    { command: 'dolar', description: 'Ver o convertir el precio del dólar a COP' },


    { command: 'ask', description: 'Preguntarle algo a la IA' },
    { command: 'get', description: 'Descargar video (TikTok, Instagram, YouTube)' },
    { command: 'cloud', description: 'Explorar tus archivos guardados' },
    { command: 'web', description: 'Vincular tu teléfono y acceder a GlowPic' },


  ]);



  const explorerApp = createExplorerServer(bot);
  const explorerHttpServer = explorerApp.listen(EXPLORER_PORT, () => {
    console.info(`[INFO] ✅ Explorer server escuchando en http://localhost:${EXPLORER_PORT}`);
  });




  explorerHttpServer.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `[ERROR] El puerto ${EXPLORER_PORT} ya está en uso. El explorer server (GlowPic) no pudo iniciarse, pero el bot de Telegram seguirá funcionando con normalidad.`
      );
    } else {
      console.error(`[ERROR] Explorer server: ${err.message}`);
    }
  });


  process.once('SIGINT', () => {
    console.info('[INFO] SIGINT recibido. Deteniendo bot...');
    bot.stop('SIGINT');
  });
  process.once('SIGTERM', () => {
    console.info('[INFO] SIGTERM recibido. Deteniendo bot...');
    bot.stop('SIGTERM');
  });


  await bot.launch();

  const botInfo = await bot.telegram.getMe();
  console.info(`[INFO] ✅ Bot iniciado correctamente: @${botInfo.username} (ID: ${botInfo.id})`);
}

main().catch((err) => {
  console.error('[FATAL] El bot no pudo iniciarse:', err);
  process.exit(1);
});