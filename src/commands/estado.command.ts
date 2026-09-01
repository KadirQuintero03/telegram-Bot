import { Telegraf } from 'telegraf';
import os from 'os';
import si from 'systeminformation';
import { BotContext } from '../types/bot.types.js';
import { commandTrigger } from '../utils/commandMatcher.js';
import { deleteCommandMessage } from '../utils/telegramHelpers.js';
import { escapeMarkdown } from '../utils/formatters.js';

export function registerEstadoCommand(bot: Telegraf<BotContext>): void {
  bot.hears(commandTrigger('estado'), async (ctx) => {
    try {
      await ctx.sendChatAction('typing');

      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const memPercent = ((usedMem / totalMem) * 100).toFixed(1);

      const load = os.loadavg();
      const cpuPercent = await getCpuUsage();

      const fs = await si.fsSize();
      const isWindows = os.platform() === 'win32';
      const main = isWindows
        ? fs.find((d) => /^C:/.test(d.fs)) ?? fs[0]
        : fs.find((d) => d.mount === '/') ?? fs[0];

      const totalDisk = main?.size ?? 0;
      const freeDisk = main?.available ?? 0;
      const diskPercent = totalDisk > 0 ? ((1 - freeDisk / totalDisk) * 100).toFixed(1) : '0';

      const hostname = os.hostname();
      const platform = `${os.type()} ${os.release()}`;
      const uptimeHours = (os.uptime() / 3600).toFixed(1);

      const message =
        `🖥️ *Estado del sistema*\n\n` +
        `🧠 CPU \\- Uso: *${cpuPercent}%* \\(load 1m: ${load[0]?.toFixed(2) ?? '0'}\\)\n` +
        `💾 RAM \\- *${(usedMem / 1024 ** 3).toFixed(1)}* GB / *${(totalMem / 1024 ** 3).toFixed(1)}* GB \\(*${memPercent}%*\\)\n` +
        `📊 Disco \\- *${(totalDisk / 1024 ** 3).toFixed(1)}* GB total, *${(freeDisk / 1024 ** 3).toFixed(1)}* GB libres \\(*${diskPercent}%* usado\\)\n\n` +
        `💻 Equipo: ${escapeMarkdown(hostname)}\n` +
        `🛡 SO: ${escapeMarkdown(platform)}\n` +
        `⏱ Activo: *${uptimeHours}* horas`;

      await ctx.reply(message, { parse_mode: 'MarkdownV2' });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      console.error(`[ERROR] /estado: ${msg}`);
      await ctx.reply(`❌ No pude obtener el estado del sistema\\.\n${escapeMarkdown(msg)}`, {
        parse_mode: 'MarkdownV2',
      });
    } finally {
      await deleteCommandMessage(ctx);
    }
  });
}

/** Devuelve el porcentaje de uso actual de la CPU. */
async function getCpuUsage(): Promise<string> {
  try {
    const load = await si.currentLoad();
    return load.currentLoad.toFixed(1);
  } catch {
    const avg = os.loadavg()[0] ?? 0;
    return (avg * 100).toFixed(1);
  }
}
