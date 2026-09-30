import os from 'os';
import si from 'systeminformation';
import { buildHardwareReport } from '../utils/hardware.js';
import { escapeMarkdown } from '../utils/formatters.js';

export interface SystemStatusResult {
  message: string;
}

export class SystemService {
  async getSystemStatus(): Promise<string> {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercent = ((usedMem / totalMem) * 100).toFixed(1);

    const load = os.loadavg();
    const cpuPercent = await this.getCpuUsage();

    const fs = await this.getDiskInfo();
    const isWindows = os.platform() === 'win32';
    const main = isWindows
      ? fs.find((d) => /^C:/.test(d.fs)) ?? fs[0]
      : fs.find((d) => d.mount === '/') ?? fs[0];

    const totalDisk = main?.size ?? 0;
    const freeDisk = main?.available ?? 0;
    const diskPercent = totalDisk > 0 ? ((1 - freeDisk / totalDisk) * 100).toFixed(1) : '0';

    const sistema =
      `*Rendimiento actual*\n\n` +
      `CPU \\- Uso: *${escapeMarkdown(cpuPercent)}%* \\(load 1m: ${escapeMarkdown((load[0] ?? 0).toFixed(2))}\\)\n` +
      `RAM \\- *${escapeMarkdown((usedMem / 1024 ** 3).toFixed(1))}* GB / *${escapeMarkdown((totalMem / 1024 ** 3).toFixed(1))}* GB \\(*${escapeMarkdown(memPercent)}%*\\)\n` +
      `Disco \\(${escapeMarkdown(String(main?.fs ?? '\\/'))}\\) \\- *${escapeMarkdown((totalDisk / 1024 ** 3).toFixed(1))}* GB total, *${escapeMarkdown((freeDisk / 1024 ** 3).toFixed(1))}* GB libres \\(*${escapeMarkdown(diskPercent)}%* usado\\)`;

    const hardware = await buildHardwareReport();
    return `${sistema}\n\n${hardware}`;
  }

  private async getCpuUsage(): Promise<string> {
    try {
      const load = await si.currentLoad();
      return load.currentLoad.toFixed(1);
    } catch {
      const avg = os.loadavg()[0] ?? 0;
      return (avg * 100).toFixed(1);
    }
  }

  private async getDiskInfo(): Promise<{ fs: string; size: number; available: number; mount: string }[]> {
    try {
      return await si.fsSize();
    } catch {
      return [{ fs: '/', size: 0, available: 0, mount: '/' }];
    }
  }
}

export const systemService = new SystemService();
