import { FinanzaTransaction, UserFinanceProfile } from '../types/finanzas.types.js';
import { escapeMarkdown } from './formatters.js';

export const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

/** Formatea un monto numérico a Pesos Colombianos (COP): 130000 -> "130.000". */
export function formatCopAmount(amount: number): string {
  return amount.toLocaleString('es-CO', { maximumFractionDigits: 0 });
}

/** Devuelve una cadena de monto COP escapada para MarkdownV2: 130000 -> "130\.000". */
export function escapeCop(amount: number): string {
  return escapeMarkdown(formatCopAmount(amount));
}

/** Convierte una fecha dada (o de hoy) al formato estándar estricto DD/MM/AAAA. */
export function normalizeDateDDMMAAAA(rawDate?: string): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');

  if (!rawDate || !rawDate.trim()) {
    return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
  }

  const trimmed = rawDate.trim();

  // Caso 1: YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const y = isoMatch[1]!;
    const m = pad(parseInt(isoMatch[2]!, 10));
    const d = pad(parseInt(isoMatch[3]!, 10));
    return `${d}/${m}/${y}`;
  }

  // Caso 2: DD/MM/YYYY o D/M/YY
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (dmyMatch) {
    const d = pad(parseInt(dmyMatch[1]!, 10));
    const m = pad(parseInt(dmyMatch[2]!, 10));
    let y = dmyMatch[3]!;
    if (y.length === 2) {
      y = `20${y}`;
    }
    return `${d}/${m}/${y}`;
  }

  return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
}

/** Convierte una cadena DD/MM/AAAA a un objeto Date local. */
export function parseDDMMAAAA(dateStr: string): Date {
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0]!, 10);
    const month = parseInt(parts[1]!, 10) - 1;
    const year = parseInt(parts[2]!, 10);
    return new Date(year, month, day);
  }
  return new Date();
}

/** Calcula totales de una lista de transacciones. */
export function calculateTotals(transactions: FinanzaTransaction[]) {
  let totalIngresos = 0;
  let totalGastos = 0;

  for (const tx of transactions) {
    if (tx.tipo === 'ingreso') {
      totalIngresos += tx.monto;
    } else if (tx.tipo === 'gasto') {
      totalGastos += tx.monto;
    }
  }

  return {
    totalIngresos,
    totalGastos,
    balancePeriodo: totalIngresos - totalGastos,
  };
}

/** Filtra transacciones por rango de fechas [inicio, fin]. */
export function filterByDateRange(
  transactions: FinanzaTransaction[],
  inicio: Date,
  fin: Date
): FinanzaTransaction[] {
  return transactions.filter((tx) => {
    const d = parseDDMMAAAA(tx.fecha);
    return d >= inicio && d <= fin;
  });
}

/** Agrupa transacciones por categoría. */
export function groupByCategory(transactions: FinanzaTransaction[]): Map<string, { ingresos: number; gastos: number }> {
  const map = new Map<string, { ingresos: number; gastos: number }>();

  for (const tx of transactions) {
    const current = map.get(tx.categoria) ?? { ingresos: 0, gastos: 0 };
    if (tx.tipo === 'ingreso') {
      current.ingresos += tx.monto;
    } else {
      current.gastos += tx.monto;
    }
    map.set(tx.categoria, current);
  }

  return map;
}

/** Construye el informe de resumen semanal. */
export function buildWeeklyReport(
  usuario: string,
  profile: UserFinanceProfile,
  transactions: FinanzaTransaction[]
): string {
  const now = new Date();
  const hace7Dias = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  const weeklyTx = filterByDateRange(transactions, hace7Dias, now);
  const { totalIngresos, totalGastos, balancePeriodo } = calculateTotals(weeklyTx);

  let text = `*Resumen Semanal de Finanzas*\n`;
  text += `Usuario: *${escapeMarkdown(usuario)}*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n`;
  text += `• Total Ingresos: *$${escapeCop(totalIngresos)} COP*\n`;
  text += `• Total Gastos: *$${escapeCop(totalGastos)} COP*\n`;
  text += `• Balance de la semana: *$${escapeCop(balancePeriodo)} COP*\n\n`;
  text += `💰 *Saldo general actual:* *$${escapeCop(profile.balance)} COP*\n\n`;

  if (weeklyTx.length === 0) {
    text += `_No registraste transacciones en los últimos 7 días\._`;
  } else {
    text += `*Desglose por categoría:*\n`;
    const catMap = groupByCategory(weeklyTx);
    for (const [cat, data] of catMap.entries()) {
      text += `• *${escapeMarkdown(cat)}*: `;
      if (data.ingresos > 0) text += `+$$${escapeCop(data.ingresos)} `;
      if (data.gastos > 0) text += `\\-$${escapeCop(data.gastos)}`;
      text += `\n`;
    }
  }

  return text;
}

/** Construye el informe de resumen mensual. */
export function buildMonthlyReport(
  usuario: string,
  profile: UserFinanceProfile,
  transactions: FinanzaTransaction[]
): string {
  const now = new Date();
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlyTx = filterByDateRange(transactions, inicioMes, now);
  const { totalIngresos, totalGastos, balancePeriodo } = calculateTotals(monthlyTx);
  const nombreMes = MESES[now.getMonth()]!;

  let text = `*Resumen Mensual de Finanzas* \\(${nombreMes} ${now.getFullYear()}\\)\n`;
  text += `Usuario: *${escapeMarkdown(usuario)}*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n`;
  text += `• Total Ingresos: *$${escapeCop(totalIngresos)} COP*\n`;
  text += `• Total Gastos: *$${escapeCop(totalGastos)} COP*\n`;
  text += `• Balance del mes: *$${escapeCop(balancePeriodo)} COP*\n\n`;
  text += `💰 *Saldo general actual:* *$${escapeCop(profile.balance)} COP*\n\n`;

  if (monthlyTx.length === 0) {
    text += `_No tienes transacciones en lo que va de ${nombreMes}\._`;
  } else {
    text += `*Desglose por categoría:*\n`;
    const catMap = groupByCategory(monthlyTx);
    for (const [cat, data] of catMap.entries()) {
      text += `• *${escapeMarkdown(cat)}*: `;
      if (data.ingresos > 0) text += `+$$${escapeCop(data.ingresos)} `;
      if (data.gastos > 0) text += `\\-$${escapeCop(data.gastos)}`;
      text += `\n`;
    }
  }

  return text;
}

/** Construye el informe de resumen anual. */
export function buildAnnualReport(
  usuario: string,
  profile: UserFinanceProfile,
  transactions: FinanzaTransaction[]
): string {
  const now = new Date();
  const inicioAnio = new Date(now.getFullYear(), 0, 1);
  const annualTx = filterByDateRange(transactions, inicioAnio, now);
  const { totalIngresos, totalGastos, balancePeriodo } = calculateTotals(annualTx);

  let text = `*Resumen Anual de Finanzas* \\(${now.getFullYear()}\\)\n`;
  text += `Usuario: *${escapeMarkdown(usuario)}*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n`;
  text += `• Total Ingresos: *$${escapeCop(totalIngresos)} COP*\n`;
  text += `• Total Gastos: *$${escapeCop(totalGastos)} COP*\n`;
  text += `• Balance del año: *$${escapeCop(balancePeriodo)} COP*\n\n`;
  text += `💰 *Saldo general actual:* *$${escapeCop(profile.balance)} COP*\n\n`;

  if (annualTx.length === 0) {
    text += `_No registraste transacciones en este año\._`;
  } else {
    text += `*Totales por mes:*\n`;
    for (let m = 0; m <= now.getMonth(); m++) {
      const inicio = new Date(now.getFullYear(), m, 1);
      const fin = new Date(now.getFullYear(), m + 1, 0, 23, 59, 59);
      const mesTx = filterByDateRange(annualTx, inicio, fin);
      const totals = calculateTotals(mesTx);
      text += `• *${escapeMarkdown(MESES[m]!)}*: Ingresos: +$$${escapeCop(totals.totalIngresos)} COP | Gastos: \\-$${escapeCop(totals.totalGastos)} COP\n`;
    }
  }

  return text;
}

/** Construye el informe de resumen por categorías. */
export function buildCategoryReport(
  usuario: string,
  profile: UserFinanceProfile,
  transactions: FinanzaTransaction[]
): string {
  let text = `*Resumen General por Categorías*\n`;
  text += `Usuario: *${escapeMarkdown(usuario)}*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n`;
  text += `💰 *Saldo general actual:* *$${escapeCop(profile.balance)} COP*\n\n`;

  if (transactions.length === 0) {
    text += `_No tienes ninguna transacción registrada hasta la fecha\._`;
  } else {
    const catMap = groupByCategory(transactions);
    text += `*Desglose acumulado por categoría:*\n\n`;
    for (const [cat, data] of catMap.entries()) {
      text += `📂 *${escapeMarkdown(cat)}*\n`;
      if (data.ingresos > 0) text += `   • Ingresos: +$$${escapeCop(data.ingresos)} COP\n`;
      if (data.gastos > 0) text += `   • Gastos: \\-$${escapeCop(data.gastos)} COP\n`;
      const neto = data.ingresos - data.gastos;
      text += `   • Neto: *$${escapeCop(neto)} COP*\n\n`;
    }
  }

  return text;
}
