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

/** Convierte una fecha dada al formato DD/MM/AAAA. */
export function formatDateDDMMAAAA(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
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
    return new Date(year, month, day, 0, 0, 0, 0);
  }
  return new Date();
}

/** Obtiene el rango de fechas [inicio (Lunes 00:00:00), fin (Domingo 23:59:59)] de la semana. */
export function getWeekDateRange(refDate: Date = new Date()): { inicio: Date; fin: Date } {
  const now = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  const currentDayOfWeek = now.getDay(); // 0 (Sun) .. 6 (Sat)
  const distanceToMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;

  const inicio = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distanceToMonday, 0, 0, 0, 0);
  const fin = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 6, 23, 59, 59, 999);

  return { inicio, fin };
}

/** Obtiene el rango de fechas del mes actual (1 al último día del mes). */
export function getMonthDateRange(refDate: Date = new Date()): { inicio: Date; fin: Date } {
  const year = refDate.getFullYear();
  const month = refDate.getMonth();

  const inicio = new Date(year, month, 1, 0, 0, 0, 0);
  const fin = new Date(year, month + 1, 0, 23, 59, 59, 999);

  return { inicio, fin };
}

/** Obtiene el rango de fechas del año actual (1 de enero al 31 de diciembre). */
export function getAnnualDateRange(refDate: Date = new Date()): { inicio: Date; fin: Date } {
  const year = refDate.getFullYear();

  const inicio = new Date(year, 0, 1, 0, 0, 0, 0);
  const fin = new Date(year, 11, 31, 23, 59, 59, 999);

  return { inicio, fin };
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

/** Identifica la categoría con más gastos en un conjunto de transacciones. */
export function getTopExpenseCategory(
  transactions: FinanzaTransaction[]
): { category: string; total: number } | null {
  const gastosMap = new Map<string, number>();

  for (const tx of transactions) {
    if (tx.tipo === 'gasto') {
      const current = gastosMap.get(tx.categoria) ?? 0;
      gastosMap.set(tx.categoria, current + tx.monto);
    }
  }

  if (gastosMap.size === 0) {
    return null;
  }

  let topCategory = '';
  let maxTotal = -1;

  for (const [cat, total] of gastosMap.entries()) {
    if (total > maxTotal) {
      maxTotal = total;
      topCategory = cat;
    }
  }

  return { category: topCategory, total: maxTotal };
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

/** Construye el informe de resumen semanal (Lunes a Domingo). */
export function buildWeeklyReport(
  usuario: string,
  profile: UserFinanceProfile,
  transactions: FinanzaTransaction[],
  refDate: Date = new Date()
): string {
  const { inicio, fin } = getWeekDateRange(refDate);
  const weeklyTx = filterByDateRange(transactions, inicio, fin);
  const { totalIngresos, totalGastos, balancePeriodo } = calculateTotals(weeklyTx);
  const topExpense = getTopExpenseCategory(weeklyTx);

  const inicioStr = formatDateDDMMAAAA(inicio);
  const finStr = formatDateDDMMAAAA(fin);

  let text = `*Resumen Semanal de Finanzas*\n`;
  text += `Usuario: *${escapeMarkdown(usuario)}*\n`;
  text += `📅 Periodo: *${escapeMarkdown(inicioStr)}* al *${escapeMarkdown(finStr)}*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n`;
  text += `• Total Ingresos: *$${escapeCop(totalIngresos)} COP*\n`;
  text += `• Total Gastos: *$${escapeCop(totalGastos)} COP*\n`;
  text += `• Balance de la semana: *$${escapeCop(balancePeriodo)} COP*\n\n`;

  if (topExpense) {
    text += `🔥 *Categoría con más gastos:* *${escapeMarkdown(topExpense.category)}* \\(*$${escapeCop(topExpense.total)} COP*\\)\n\n`;
  } else {
    text += `🔥 *Categoría con más gastos:* _No se registraron gastos en este periodo_\n\n`;
  }

  text += `💰 *Saldo general actual:* *$${escapeCop(profile.balance)} COP*\n\n`;

  if (weeklyTx.length === 0) {
    text += `_No registraste transacciones en esta semana\._`;
  } else {
    text += `*Desglose por categoría:*\n`;
    const catMap = groupByCategory(weeklyTx);
    for (const [cat, data] of catMap.entries()) {
      text += `• *${escapeMarkdown(cat)}*: `;
      if (data.ingresos > 0) text += `+$${escapeCop(data.ingresos)} `;
      if (data.gastos > 0) text += `\\-$${escapeCop(data.gastos)}`;
      text += `\n`;
    }
  }

  return text;
}

/** Construye el informe de resumen mensual (Mes actual). */
export function buildMonthlyReport(
  usuario: string,
  profile: UserFinanceProfile,
  transactions: FinanzaTransaction[],
  refDate: Date = new Date()
): string {
  const { inicio, fin } = getMonthDateRange(refDate);
  const monthlyTx = filterByDateRange(transactions, inicio, fin);
  const { totalIngresos, totalGastos, balancePeriodo } = calculateTotals(monthlyTx);
  const topExpense = getTopExpenseCategory(monthlyTx);

  const nombreMes = MESES[refDate.getMonth()]!;
  const inicioStr = formatDateDDMMAAAA(inicio);
  const finStr = formatDateDDMMAAAA(fin);

  let text = `*Resumen Mensual de Finanzas* \\(${escapeMarkdown(nombreMes)} ${refDate.getFullYear()}\\)\n`;
  text += `Usuario: *${escapeMarkdown(usuario)}*\n`;
  text += `🗓️ Periodo: *${escapeMarkdown(inicioStr)}* al *${escapeMarkdown(finStr)}*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n`;
  text += `• Total Ingresos: *$${escapeCop(totalIngresos)} COP*\n`;
  text += `• Total Gastos: *$${escapeCop(totalGastos)} COP*\n`;
  text += `• Balance del mes: *$${escapeCop(balancePeriodo)} COP*\n\n`;

  if (topExpense) {
    text += `🔥 *Categoría con más gastos:* *${escapeMarkdown(topExpense.category)}* \\(*$${escapeCop(topExpense.total)} COP*\\)\n\n`;
  } else {
    text += `🔥 *Categoría con más gastos:* _No se registraron gastos en este periodo_\n\n`;
  }

  text += `💰 *Saldo general actual:* *$${escapeCop(profile.balance)} COP*\n\n`;

  if (monthlyTx.length === 0) {
    text += `_No tienes transacciones en lo que va de ${escapeMarkdown(nombreMes)}\._`;
  } else {
    text += `*Desglose por categoría:*\n`;
    const catMap = groupByCategory(monthlyTx);
    for (const [cat, data] of catMap.entries()) {
      text += `• *${escapeMarkdown(cat)}*: `;
      if (data.ingresos > 0) text += `+$${escapeCop(data.ingresos)} `;
      if (data.gastos > 0) text += `\\-$${escapeCop(data.gastos)}`;
      text += `\n`;
    }
  }

  return text;
}

/** Construye el informe de resumen anual (Año actual). */
export function buildAnnualReport(
  usuario: string,
  profile: UserFinanceProfile,
  transactions: FinanzaTransaction[],
  refDate: Date = new Date()
): string {
  const { inicio, fin } = getAnnualDateRange(refDate);
  const annualTx = filterByDateRange(transactions, inicio, fin);
  const { totalIngresos, totalGastos, balancePeriodo } = calculateTotals(annualTx);
  const topExpense = getTopExpenseCategory(annualTx);

  const year = refDate.getFullYear();
  const inicioStr = formatDateDDMMAAAA(inicio);
  const finStr = formatDateDDMMAAAA(fin);

  let text = `*Resumen Anual de Finanzas* \\(${year}\\)\n`;
  text += `Usuario: *${escapeMarkdown(usuario)}*\n`;
  text += `📊 Periodo: *${escapeMarkdown(inicioStr)}* al *${escapeMarkdown(finStr)}*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n`;
  text += `• Total Ingresos: *$${escapeCop(totalIngresos)} COP*\n`;
  text += `• Total Gastos: *$${escapeCop(totalGastos)} COP*\n`;
  text += `• Balance del año: *$${escapeCop(balancePeriodo)} COP*\n\n`;

  if (topExpense) {
    text += `🔥 *Categoría con más gastos:* *${escapeMarkdown(topExpense.category)}* \\(*$${escapeCop(topExpense.total)} COP*\\)\n\n`;
  } else {
    text += `🔥 *Categoría con más gastos:* _No se registraron gastos en este periodo_\n\n`;
  }

  text += `💰 *Saldo general actual:* *$${escapeCop(profile.balance)} COP*\n\n`;

  if (annualTx.length === 0) {
    text += `_No registraste transacciones en este año\._`;
  } else {
    text += `*Totales por mes:*\n`;
    for (let m = 0; m <= refDate.getMonth(); m++) {
      const inicioMes = new Date(year, m, 1, 0, 0, 0, 0);
      const finMes = new Date(year, m + 1, 0, 23, 59, 59, 999);
      const mesTx = filterByDateRange(annualTx, inicioMes, finMes);
      const totals = calculateTotals(mesTx);
      text += `• *${escapeMarkdown(MESES[m]!)}*: Ingresos: +$${escapeCop(totals.totalIngresos)} COP | Gastos: \\-$${escapeCop(totals.totalGastos)} COP | Balance: *$${escapeCop(totals.balancePeriodo)} COP*\n`;
    }
  }

  return text;
}

/** Construye el informe de resumen por categorías (Por ahora no disponible). */
export function buildCategoryReport(
  _usuario: string,
  _profile: UserFinanceProfile,
  _transactions: FinanzaTransaction[]
): string {
  return (
    `📂 *Resumen por Categoría*\n\n` +
    `_Esta funcionalidad no está disponible por el momento y estará lista próximamente\._`
  );
}
