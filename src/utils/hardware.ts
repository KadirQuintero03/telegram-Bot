import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import si from 'systeminformation';
import { escapeMarkdown } from './formatters.js';

const execFileAsync = promisify(execFile);

/** Nombres de fabricantes PCI/USB comunes por su Vendor ID (VEN_/VID_). */
const VENDOR_IDS: Record<string, string> = {
  '8086': 'Intel',
  '1022': 'AMD',
  '10DE': 'NVIDIA',
  '1002': 'AMD/ATI',
  '14E4': 'Broadcom',
  '10EC': 'Realtek',
  '0BDA': 'Realtek',
  '168C': 'Qualcomm Atheros',
  '0CF3': 'Qualcomm Atheros',
  '1969': 'Qualcomm Atheros',
  '11AB': 'Marvell',
  '1B4B': 'Marvell',
  '1B21': 'ASMedia',
  '1000': 'LSI/Broadcom',
  '1033': 'NEC',
  '1912': 'Renesas',
  '1AF4': 'Red Hat (Virtio)',
  '15AD': 'VMware',
  '80EE': 'Oracle (VirtualBox)',
  '1D6B': 'Linux Foundation',
};

/** Deduce el fabricante a partir de un deviceId PCI/USB (VEN_xxxx / VID_xxxx). */
function vendorFromDeviceId(deviceId: string | null | undefined): string {
  if (!deviceId) return 'No reportado';
  const match = deviceId.match(/(?:VEN|VID)_([0-9A-Fa-f]{4})/);
  if (!match) return 'No reportado';
  const id = match[1]!.toUpperCase();
  return VENDOR_IDS[id] ?? `Vendor 0x${id}`;
}

/** Deduce el tipo de firmware en Windows (UEFI vs BIOS legacy). */
async function firmwareType(): Promise<string> {
  if (process.platform !== 'win32') return 'No reportado';
  try {
    const { stdout } = await execFileAsync(
      'reg.exe',
      ['query', 'HKLM\\SYSTEM\\CurrentControlSet\\Control', '/v', 'PEFirmwareType'],
      { timeout: 3000, windowsHide: true }
    );
    const match = stdout.match(/0x([0-9a-fA-F]+)/);
    if (match) {
      const value = parseInt(match[1], 16);
      return value === 2 ? 'UEFI' : value === 1 ? 'BIOS (legacy)' : 'No reportado';
    }
  } catch {
    /* falla: seguimos con .NET */
  }
  try {
    const { stdout } = await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-Command', 'Write-Output ([int][System.Environment]::FirmwareType)'],
      { timeout: 3000, windowsHide: true }
    );
    const value = parseInt(stdout.trim(), 10);
    return value === 2 ? 'UEFI' : value === 1 ? 'BIOS (legacy)' : 'No reportado';
  } catch {
    return 'No reportado';
  }
}

/** Convierte bytes a megabytes con separador de miles. */
function toMb(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return 'N/D';
  return Math.round(bytes / 1024 ** 2).toLocaleString('es-CO');
}

/** Convierte bytes a gigabytes con un decimal. */
function toGb(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return 'N/D';
  return (bytes / 1024 ** 3).toLocaleString('es-CO', { maximumFractionDigits: 1 });
}

/** Devuelve un valor escapado o un texto por defecto si viene vacío. */
function safe(value: string | number | null | undefined, fallback = 'No reportado'): string {
  const text = value === null || value === undefined ? '' : String(value).trim();
  return escapeMarkdown(text.length > 0 ? text : fallback);
}

/** Formatea una fecha como DD/MM/AAAA HH:MM. */
function fmtDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** 1. Información general del PC. */
async function infoGeneralSection(): Promise<string> {
  try {
    const [system, chassis, nets] = await Promise.all([
      si.system(),
      si.chassis(),
      si.networkInterfaces(),
    ]);

    const ipAddrs = [...new Set(nets.filter((n) => !n.internal && n.ip4).map((n) => n.ip4))];
    const red = ipAddrs.length > 0 ? ipAddrs.join(', ') : 'No reportado';
    const numeroInventario =
      (system.sku && system.sku.trim() && system.sku !== '0000000000000000' && system.sku !== 'To be filled by O.E.M.')
        ? system.sku
        : (chassis.assetTag && chassis.assetTag.trim() ? chassis.assetTag : 'No reportado');
    const usuario = (() => {
      try {
        return os.userInfo().username || 'No reportado';
      } catch {
        return 'No reportado';
      }
    })();
    const bootDate = fmtDate(new Date(Date.now() - os.uptime() * 1000));

    const lines = [
      `• Nombre del equipo: ${safe(os.hostname())}`,
      `• Sistema operativo: ${safe(`${os.type()} ${os.release()}`)}`,
      `• Tipo de computador: ${safe(chassis.type)}`,
      `• Fabricante: ${safe(system.manufacturer)}`,
      `• Modelo: ${safe(system.model)}`,
      `• N\\.º de serie: ${safe(system.serial)}`,
      `• N\\.º de inventario: ${safe(numeroInventario)}`,
      `• UUID: ${safe(system.uuid)}`,
      `• Red: ${escapeMarkdown(red)}`,
      `• Estado: Activo`,
      `• Última fecha de arranque: ${escapeMarkdown(bootDate)}`,
      `• Usuario asignado: ${safe(usuario)}`,
      `• N\\.º de usuario alternativo: No reportado \\(dato GLPI\\)`,
      `• Nombre de usuario alternativo: No reportado \\(dato GLPI\\)`,
      `• Grupo: No reportado \\(dato GLPI\\)`,
      `• Ubicación: No reportado por el SO`,
    ];

    return `*1\\. Información general del PC*\n${lines.join('\n')}`;
  } catch {
    return '*1\\. Información general del PC*\nNo disponible\\.';
  }
}

/** 2. Volúmenes / discos lógicos (particiones). */
async function volumenesSection(): Promise<string> {
  try {
    const vols = await si.fsSize();
    if (!vols.length) return '*2\\. Volúmenes \\/ Discos*\nNo se detectaron volúmenes\\.';

    const items = vols.map((v) => {
      const freePct = v.use != null && !Number.isNaN(v.use) ? (100 - v.use).toFixed(1) : 'N/D';
      const lines = [
        `• *${safe(v.fs, 'Volumen')}*`,
        `  Partición: ${safe(v.fs)}`,
        `  Punto de montaje: ${safe(v.mount)}`,
        `  Sistema de archivos: ${safe(v.type)}`,
        `  Tamaño global: ${escapeMarkdown(toMb(v.size))} MB \\(${escapeMarkdown(toGb(v.size))} GB\\)`,
        `  Tamaño libre: ${escapeMarkdown(toMb(v.available))} MB \\(${escapeMarkdown(toGb(v.available))} GB\\)`,
        `  Porcentaje libre: *${safe(freePct)}%*`,
        `  Cifrado: No reportado`,
      ];
      return lines.join('\n');
    });

    return `*2\\. Volúmenes \\/ Discos \\(particiones lógicas\\)*\n${items.join('\n')}`;
  } catch {
    return '*2\\. Volúmenes \\/ Discos*\nNo disponible\\.';
  }
}

/** 3. Firmware / BIOS. */
async function biosSection(): Promise<string> {
  try {
    const bios = await si.bios();
    const tipo =
      (Array.isArray(bios.features) && bios.features.some((f) => /uefi/i.test(f))
        ? 'UEFI'
        : await firmwareType()) || 'No reportado';
    const lines = [
      `• Fabricante: ${safe(bios.vendor)}`,
      `• Tipo: ${safe(tipo)}`,
      `• Versión: ${safe(bios.version)}`,
      `• Fecha de lanzamiento: ${safe(bios.releaseDate)}`,
      `• Ubicación: No reportado`,
    ];
    return `*3\\. Firmware \\/ BIOS*\n${lines.join('\n')}`;
  } catch {
    return '*3\\. Firmware \\/ BIOS*\nNo disponible\\.';
  }
}

/** 4. Procesador. */
async function cpuSection(): Promise<string> {
  try {
    const cpu = await si.cpu();
    const freqMHz = Math.round((cpu.speedMax || cpu.speed) * 1000).toLocaleString('es-CO');
    const lines = [
      `• Modelo: ${safe(cpu.brand)}`,
      `• Fabricante: ${safe(cpu.manufacturer || cpu.vendor)}`,
      `• Frecuencia: ${escapeMarkdown(freqMHz)} MHz`,
      `• N\\.º de serie: No reportado`,
      `• Núcleos \\(físicos\\): ${safe(cpu.physicalCores)}`,
      `• Hilos: ${safe(cpu.cores)}`,
      `• Ubicación \\(socket\\): ${safe(cpu.socket)}`,
    ];
    return `*4\\. Procesador*\n${lines.join('\n')}`;
  } catch {
    return '*4\\. Procesador*\nNo disponible\\.';
  }
}

/** 5. Memoria RAM (módulos). */
async function memoriaSection(): Promise<string> {
  try {
    const modules = await si.memLayout();
    if (!modules.length) return '*5\\. Memoria RAM*\nNo se pudo detectar información de los módulos\\.';

    const items = modules.map((m, i) => {
      const lines = [
        `• *Módulo ${i + 1}* \\(${safe(m.formFactor, 'Módulo')}\\)`,
        `  Fabricante: ${safe(m.manufacturer)}`,
        `  Tipo: ${safe(m.type)}`,
        `  Frecuencia: ${safe(m.clockSpeed, 'N/D')} MHz`,
        `  Tamaño: ${escapeMarkdown(toMb(m.size))} MB`,
        `  N\\.º de serie: ${safe(m.serialNum)}`,
        `  Posición en el bus: ${safe(m.bank)}`,
        `  Ubicación: ${safe(m.bank)}`,
      ];
      return lines.join('\n');
    });

    return `*5\\. Memoria RAM* \\(${modules.length} módulos\\)\n${items.join('\n')}`;
  } catch {
    return '*5\\. Memoria RAM*\nNo disponible\\.';
  }
}

/** 6. Discos duros (físicos). */
async function discosSection(): Promise<string> {
  try {
    const disks = await si.diskLayout();
    if (!disks.length) return '*6\\. Discos duros*\nNo se detectaron discos físicos\\.';

    const items = disks.map((d, i) => {
      const lines = [
        `• *${safe(d.name, `Disco ${i + 1}`)}*`,
        `  Interfaz: ${safe(d.interfaceType)}`,
        `  Capacidad: ${escapeMarkdown(toMb(d.size))} MB`,
        `  N\\.º de serie: ${safe(d.serialNum)}`,
        `  Ubicación: ${safe(d.device)}`,
      ];
      return lines.join('\n');
    });

    return `*6\\. Discos duros*\n${items.join('\n')}`;
  } catch {
    return '*6\\. Discos duros*\nNo disponible\\.';
  }
}

/** 7. Tarjetas de red. */
async function redSection(): Promise<string> {
  try {
    const seen = new Set<string>();
    const nets = (await si.networkInterfaces())
      .filter((n) => !n.internal)
      .filter((n) => {
        const key = n.ifaceName || n.iface || 'desconocida';
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    if (!nets.length) return '*7\\. Tarjetas de red*\nNo se detectaron interfaces de red\\.';

    const items = nets.map((n, i) => {
      const mac = n.mac && n.mac !== '00:00:00:00:00:00' ? n.mac : 'No reportado';
      const lines = [
        `• *${safe(n.ifaceName || n.iface, `Interfaz ${i + 1}`)}*`,
        `  Modelo: ${safe(n.ifaceName || n.iface)}`,
        `  Fabricante: No reportado por el SO`,
        `  Dirección MAC: ${safe(mac)}`,
        `  Ubicación: ${safe(n.iface)}`,
      ];
      return lines.join('\n');
    });

    return `*7\\. Tarjetas de red*\n${items.join('\n')}`;
  } catch {
    return '*7\\. Tarjetas de red*\nNo disponible\\.';
  }
}

/** 8. Unidad óptica (best-effort). */
async function opticosSection(): Promise<string> {
  try {
    const blocks = (await si.blockDevices()).filter(
      (b) => /rom|cd|dvd/i.test(`${b.type} ${b.name}`) || /\/dev\/sr\d/.test(b.name)
    );
    if (!blocks.length) return '*8\\. Unidad óptica*\nNo se detectaron unidades ópticas\\.';

    const items = blocks.map((b, i) => {
      const lines = [
        `• *${safe(b.model || b.name, `Unidad ${i + 1}`)}*`,
        `  Modelo: ${safe(b.model || b.name)}`,
        `  Fabricante: No reportado`,
        `  Capacidad de grabación: No reportado por el SO`,
        `  Interfaz: ${safe(b.protocol)}`,
        `  Ubicación: ${safe(b.device || b.name)}`,
      ];
      return lines.join('\n');
    });

    return `*8\\. Unidad óptica*\n${items.join('\n')}`;
  } catch {
    return '*8\\. Unidad óptica*\nNo disponible\\.';
  }
}

/** 9. Tarjetas gráficas. */
async function gpuSection(): Promise<string> {
  try {
    const { controllers } = await si.graphics();
    if (!controllers.length) return '*9\\. Tarjetas gráficas*\nNo se detectaron tarjetas gráficas\\.';

    const items = controllers.map((g, i) => {
      const memoria = g.vram
        ? `${Math.round(g.vram).toLocaleString('es-CO')} MB${g.vramDynamic ? ' (compartida)' : ''}`
        : 'N/D';
      const lines = [
        `• *${safe(g.model || g.name, `GPU ${i + 1}`)}*`,
        `  Modelo: ${safe(g.model || g.name)}`,
        `  Chipset: ${safe(g.model || g.name)}`,
        `  Memoria: ${escapeMarkdown(memoria)}`,
        `  Ubicación: ${safe(g.pciBus || g.bus)}`,
      ];
      return lines.join('\n');
    });

    return `*9\\. Tarjetas gráficas*\n${items.join('\n')}`;
  } catch {
    return '*9\\. Tarjetas gráficas*\nNo disponible\\.';
  }
}

/** 10. Tarjetas de sonido. */
async function audioSection(): Promise<string> {
  try {
    const cards = await si.audio();
    if (!cards.length) return '*10\\. Tarjetas de sonido*\nNo se detectaron tarjetas de sonido\\.';

    const items = cards.map((a, i) => {
      const chipset = (() => {
        const vendor = vendorFromDeviceId(String(a.id));
        return vendor !== 'No reportado' ? vendor : 'No reportado';
      })();
      const ubicacion = (() => {
        const raw = String(a.id);
        return raw.length > 50 ? `${raw.slice(0, 30)}...${raw.slice(-18)}` : raw;
      })();
      const lines = [
        `• *${safe(a.name, `Tarjeta ${i + 1}`)}*`,
        `  Modelo: ${safe(a.name)}`,
        `  Chipset: ${safe(chipset)}`,
        `  Ubicación: ${escapeMarkdown(ubicacion)}`,
      ];
      return lines.join('\n');
    });

    return `*10\\. Tarjetas de sonido*\n${items.join('\n')}`;
  } catch {
    return '*10\\. Tarjetas de sonido*\nNo disponible\\.';
  }
}

/** Construye el informe completo de inventario del equipo en MarkdownV2. */
export async function buildHardwareReport(): Promise<string> {
  const sections = await Promise.all([
    infoGeneralSection(),
    volumenesSection(),
    biosSection(),
    cpuSection(),
    memoriaSection(),
    discosSection(),
    redSection(),
    opticosSection(),
    gpuSection(),
    audioSection(),
  ]);
  return sections.filter((s) => s.length > 0).join('\n\n');
}