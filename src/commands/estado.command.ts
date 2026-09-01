import { Telegraf } from 'telegraf';
import os from 'os';
import si from 'systeminformation';
import { BotContext } from '../types/bot.types.js';
import { commandTrigger } from '../utils/commandMatcher.js';
import { deleteCommandMessage, safeReply } from '../utils/telegramHelpers.js';
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

      const fs = await getDiskInfo();
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
        `*Estado del sistema*\n\n` +
        `CPU \\- Uso: *${escapeMarkdown(cpuPercent)}%* \\(load 1m: ${escapeMarkdown((load[0] ?? 0).toFixed(2))}\\)\n` +
        `RAM \\- *${escapeMarkdown((usedMem / 1024 ** 3).toFixed(1))}* GB / *${escapeMarkdown((totalMem / 1024 ** 3).toFixed(1))}* GB \\(*${escapeMarkdown(memPercent)}%*\\)\n` +
        `Disco \\- *${escapeMarkdown((totalDisk / 1024 ** 3).toFixed(1))}* GB total, *${escapeMarkdown((freeDisk / 1024 ** 3).toFixed(1))}* GB libres \\(*${escapeMarkdown(diskPercent)}%* usado\\)\n\n` +
        `Equipo: ${escapeMarkdown(hostname)}\n` +
        `SO: ${escapeMarkdown(platform)}\n` +
        `Activo: *${escapeMarkdown(uptimeHours)}* horas`;

      await safeReply(ctx, message);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      console.error(`[ERROR] /estado: ${msg}`);
      await safeReply(ctx, `No pude obtener el estado del sistema\\.\n${escapeMarkdown(msg)}`);
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

/** Devuelve la información de los discos, con respaldo al C: en Windows. */
async function getDiskInfo(): Promise<{ fs: string; size: number; available: number; mount: string }[]> {
  try {
    return await si.fsSize();
  } catch {
    return [{ fs: '/', size: 0, available: 0, mount: '/'}];
  }
}
