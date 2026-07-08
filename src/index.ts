import { createBot } from './bot.js';
import { createExplorerServer } from './server/explorer.server.js';

const EXPLORER_PORT = parseInt(process.env['EXPLORER_PORT'] ?? '3000', 10);

async function main(): Promise<void> {
  console.info('[INFO] Iniciando bot de Telegram...');

  const bot = createBot();

  // ── Servidor HTTP para que GlowPic (frontend) explore los archivos ──
  const explorerApp = createExplorerServer();
  explorerApp.listen(EXPLORER_PORT, () => {
    console.info(`[INFO] ✅ Explorer server escuchando en http://localhost:${EXPLORER_PORT}`);
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