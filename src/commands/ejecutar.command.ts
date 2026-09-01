import { Telegraf } from 'telegraf';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';
import { BotContext } from '../types/bot.types.js';
import { config } from '../config/env.js';
import { commandTrigger, getCommandArgs } from '../utils/commandMatcher.js';
import { deleteCommandMessage } from '../utils/telegramHelpers.js';
import { escapeMarkdown } from '../utils/formatters.js';

const execAsync = promisify(exec);
const MAX_MESSAGE_LENGTH = 4000;
const MAX_EXEC_TIMEOUT_MS = 120_000;

/** Verifica si el id de Telegram del usuario coincide con el administrador configurado. */
function isAdmin(userId: number | undefined): boolean {
  if (!userId || !config.adminId) return false;
  return String(userId) === String(config.adminId);
}

export function registerEjecutarCommand(bot: Telegraf<BotContext>): void {
  bot.hears(commandTrigger('ejecutar'), async (ctx) => {
    if (!isAdmin(ctx.from?.id)) {
      await ctx.reply('⛔ No tienes permisos para usar este comando.', { parse_mode: 'MarkdownV2' });
      await deleteCommandMessage(ctx);
      return;
    }

    const command = getCommandArgs(ctx.message.text).trim();
    if (!command) {
      await ctx.reply('⚠️ Debes indicar un comando. Ejemplo: `/ejecutar inxi -b`', {
        parse_mode: 'Markdown',
      });
      await deleteCommandMessage(ctx);
      return;
    }

    try {
      await ctx.sendChatAction('typing');

      const { stdout, stderr } = await execAsync(command, {
        timeout: MAX_EXEC_TIMEOUT_MS,
        maxBuffer: 10 * 1024 * 1024,
        windowsHide: true,
      });

      const output = `${stdout || ''}${stderr ? `\n[stderr]\n${stderr}` : ''}`.trim() || '✅ Comando ejecutado sin salida.';

      if (output.length > MAX_MESSAGE_LENGTH) {
        await sendOutputAsDocument(ctx, command, output);
      } else {
        await ctx.reply(`💻 *Salida de* \`${escapeMarkdown(command)}\`:\n\n${escapeMarkdown(output)}`, {
          parse_mode: 'MarkdownV2',
        });
      }
    } catch (error) {
      const err = error as { stdout?: string; stderr?: string; message?: string };
      const detail = err.stderr?.trim() || err.message || 'Error desconocido';
      console.error(`[ERROR] /ejecutar "${command}": ${detail}`);

      if (detail.length > MAX_MESSAGE_LENGTH) {
        await sendOutputAsDocument(ctx, command, detail);
      } else {
        await ctx.reply(`❌ *Error ejecutando* \`${escapeMarkdown(command)}\`:\n\n${escapeMarkdown(detail)}`, {
          parse_mode: 'MarkdownV2',
        });
      }
    } finally {
      await deleteCommandMessage(ctx);
    }
  });
}

/** Guarda la salida larga en un .txt temporal y la envía como documento al chat. */
async function sendOutputAsDocument(ctx: BotContext, command: string, output: string): Promise<void> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'teldrive-'));
  const filePath = path.join(tmpDir, 'salida.txt');
  fs.writeFileSync(filePath, output, 'utf-8');

  await ctx.sendChatAction('upload_document');
  await ctx.replyWithDocument(
    { source: filePath, filename: 'salida.txt' },
    { caption: `💻 Salida de \`${command}\` (archivo)` , parse_mode: 'MarkdownV2' }
  );
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
