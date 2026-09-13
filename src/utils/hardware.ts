import si from 'systeminformation';
import { escapeMarkdown } from './formatters.js';

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

/** Convierte bytes a megabytes con separador de miles. */
function toMb(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return 'N/D';
  return Math.round(bytes / 1024 ** 2).toLocaleString('es-CO');
}

/** Devuelve un valor escapado o un guion si viene vacío. */
function safe(value: string | number | null | undefined, fallback = 'No reportado'): string {
  const text = value === null || value === undefined ? '' : String(value).trim();
  return escapeMarkdown(text.length > 0 ? text : fallback);
}

/** Sección de módulos de memoria RAM (si.memLayout). */
async function memoriaSection(): Promise<string> {
  try {
    const modules = await si.memLayout();
    if (!modules.length) return '*MEMORIA RAM*\nNo se pudo detectar información de los módulos\\.';

    const items = modules.map((m, i) => {
      const lines = [
        `• *Módulo ${i + 1}*`,
        `  Fabricante: ${safe(m.manufacturer)}`,
        `  Tipo: ${safe(m.type)}`,
        `  Frecuencia: ${safe(m.clockSpeed, 'N/D')} MHz`,
        `  Tamaño: ${escapeMarkdown(toMb(m.size))} MB`,
        `  Número de serie: ${safe(m.serialNum)}`,
        `  Ubicación \\(banco\\): ${safe(m.bank)}`,
      ];
      return lines.join('\n');
    });

    return `*MEMORIA RAM*\n${items.join('\n')}`;
  } catch {
    return '*MEMORIA RAM*\nNo disponible\\.';
  }
}

/** Sección de discos físicos (si.diskLayout). */
async function discosSection(): Promise<string> {
  try {
    const disks = await si.diskLayout();
    if (!disks.length) return '*DISCOS DUROS*\nNo se detectaron discos físicos\\.';

    const items = disks.map((d, i) => {
      const lines = [
        `• *${safe(d.name, `Disco ${i + 1}`)}*`,
        `  Interfaz: ${safe(d.interfaceType)}`,
        `  Capacidad: ${escapeMarkdown(toMb(d.size))} MB`,
        `  Número de serie: ${safe(d.serialNum)}`,
        `  Ubicación: ${safe(d.device)}`,
      ];
      return lines.join('\n');
    });

    return `*DISCOS DUROS*\n${items.join('\n')}`;
  } catch {
    return '*DISCOS DUROS*\nNo disponible\\.';
  }
}

/** Sección de tarjetas de red (si.networkInterfaces). */
async function redSection(): Promise<string> {
  try {
    const nets = (await si.networkInterfaces()).filter((n) => !n.internal);
    if (!nets.length) return '*TARJETAS DE RED*\nNo se detectaron interfaces de red\\.';

    const items = nets.map((n, i) => {
      const mac = n.mac && n.mac !== '00:00:00:00:00:00' ? n.mac : 'No reportado';
      const lines = [
        `• *${safe(n.ifaceName || n.iface, `Interfaz ${i + 1}`)}*`,
        `  Fabricante: No reportado por el SO`,
        `  Dirección MAC: ${safe(mac)}`,
        `  Ubicación: ${safe(n.iface)}`,
      ];
      return lines.join('\n');
    });

    return `*TARJETAS DE RED*\n${items.join('\n')}`;
  } catch {
    return '*TARJETAS DE RED*\nNo disponible\\.';
  }
}

/** Sección de tarjetas gráficas (si.graphics). */
async function gpuSection(): Promise<string> {
  try {
    const { controllers } = await si.graphics();
    if (!controllers.length) return '*TARJETAS GRÁFICAS*\nNo se detectaron tarjetas gráficas\\.';

const items = controllers.map((g, i) => {
      // systeminformation entrega vram en MB.
      const memoria = g.vram
        ? `${Math.round(g.vram).toLocaleString('es-CO')} MB${g.vramDynamic ? ' (compartida)' : ''}`
        : 'N/D';
      const lines = [
        `• *${safe(g.model || g.name, `GPU ${i + 1}`)}*`,
        `  Chipset: ${safe(g.model || g.name)}`,
        `  Memoria: ${escapeMarkdown(memoria)}`,
        `  Ubicación: ${safe(g.pciBus || g.bus)}`,
      ];
      return lines.join('\n');
    });

    return `*TARJETAS GRÁFICAS*\n${items.join('\n')}`;
  } catch {
    return '*TARJETAS GRÁFICAS*\nNo disponible\\.';
  }
}

/** Sección de tarjetas de sonido (si.audio). */
async function audioSection(): Promise<string> {
  try {
    const cards = await si.audio();
    if (!cards.length) return '*TARJETAS DE SONIDO*\nNo se detectaron tarjetas de sonido\\.';

    const items = cards.map((a, i) => {
      const lines = [
        `• *${safe(a.name, `Tarjeta ${i + 1}`)}*`,
        `  Fabricante: ${safe(a.manufacturer)}`,
        `  Ubicación: ${safe(a.id)}`,
      ];
      return lines.join('\n');
    });

    return `*TARJETAS DE SONIDO*\n${items.join('\n')}`;
  } catch {
    return '*TARJETAS DE SONIDO*\nNo disponible\\.';
  }
}

/** Sección de controladores (si.usb filtrado por tipo Controller). */
async function controladoresSection(): Promise<string> {
  try {
    const controllers = (await si.usb()).filter((u) => /controller/i.test(u.type ?? ''));
    if (!controllers.length) return '*CONTROLADORES*\nNo se detectaron controladores\\.';

const items = controllers.map((u, i) => {
      const deviceId = String(u.deviceId ?? '');
      const vendorBy = vendorFromDeviceId(deviceId);
      const fabricante =
        vendorBy !== 'No reportado'
          ? vendorBy
          : (u.manufacturer && u.manufacturer.trim()) || (u.vendor && u.vendor.trim()) || 'No reportado';
      const interfaz = deviceId.toUpperCase().startsWith('PCI') ? 'PCI' : 'USB';
      const lines = [
        `• *${safe(u.name, `Controlador ${i + 1}`)}*`,
        `  Fabricante: ${safe(fabricante)}`,
        `  Interfaz: ${escapeMarkdown(interfaz)}`,
        `  Ubicación: ${safe(deviceId)}`,
      ];
      return lines.join('\n');
    });

    return `*CONTROLADORES*\n${items.join('\n')}`;
  } catch {
    return '*CONTROLADORES*\nNo disponible\\.';
  }
}

/** Sección de lectores ópticos (best-effort con si.blockDevices). */
async function opticosSection(): Promise<string> {
  try {
    const blocks = (await si.blockDevices()).filter(
      (b) => /rom|cd|dvd/i.test(`${b.type} ${b.name}`) || /\/dev\/sr\d/.test(b.name)
    );
    if (!blocks.length) return '*LECTORES ÓPTICOS*\nNo se detectaron lectores ópticos\\.';

    const items = blocks.map((b, i) => {
      const lines = [
        `• *${safe(b.model || b.name, `Lector ${i + 1}`)}*`,
        `  Interfaz: ${safe(b.protocol)}`,
        `  Capacidad de grabación: No reportado por el SO`,
        `  Ubicación: ${safe(b.device || b.name)}`,
      ];
      return lines.join('\n');
    });

    return `*LECTORES ÓPTICOS*\n${items.join('\n')}`;
  } catch {
    return '*LECTORES ÓPTICOS*\nNo disponible\\.';
  }
}

/** Construye el reporte completo de hardware en MarkdownV2. */
export async function buildHardwareReport(): Promise<string> {
  const sections = await Promise.all([
    memoriaSection(),
    discosSection(),
    redSection(),
    gpuSection(),
    audioSection(),
    controladoresSection(),
    opticosSection(),
  ]);
  return sections.filter((s) => s.length > 0).join('\n\n');
}
