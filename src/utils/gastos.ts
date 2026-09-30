import { Gasto } from '../services/data-store.service.js';
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

/** Formatea un monto en pesos colombianos: 12500 -> "12.500". */
export function formatCopAmount(amount: number): string {
  return amount.toLocaleString('es-CO', { maximumFractionDigits: 2 });
}

/** Devuelve una cadena COP escapada para MarkdownV2: 12500 -> "12.500". */
export function escapeCop(amount: number): string {
  return escapeMarkdown(formatCopAmount(amount));
}

/** Devuelve los gastos cuyo timestamp cae dentro del rango [inicio, fin]. */
export function gastosInRange(gastos: Gasto[], inicio: Date, fin: Date): Gasto[] {
  return gastos.filter((g) => {
    const fecha = new Date(g.fecha);
    return fecha >= inicio && fecha <= fin;
  });
}

/** Agrupa los gastos por categoría y suma el monto de cada una. */
export function groupByCategory(gastos: Gasto[]): Map<string, number> {
  const byCategory = new Map<string, number>();
  for (const gasto of gastos) {
    byCategory.set(gasto.categoria, (byCategory.get(gasto.categoria) ?? 0) + gasto.monto);
  }
  return byCategory;
}

/** Agrupa los gastos por mes del año (0 = enero ... 11 = diciembre) y suma cada mes. */
export function groupByMonth(gastos: Gasto[]): Map<number, number> {
  const byMonth = new Map<number, number>();
  for (const gasto of gastos) {
    const month = new Date(gasto.fecha).getMonth();
    byMonth.set(month, (byMonth.get(month) ?? 0) + gasto.monto);
  }
  return byMonth;
}

/** Suma total de una lista de gastos. */
export function totalGastos(gastos: Gasto[]): number {
  return gastos.reduce((sum, g) => sum + g.monto, 0);
}

/** Construye las líneas por categoría en MarkdownV2. */
function categoryLines(byCategory: Map<string, number>): string {
  const lines = [...byCategory.entries()].map(
    ([categoria, total]) => `• *${escapeMarkdown(categoria)}*: $${escapeCop(total)} COP`
  );
  return lines.length > 0 ? lines.join('\n') : 'Sin gastos registrados.';
}

/** Construye un resumen genérico por categorías con título, líneas y total. */
function buildCategorySummary(titulo: string, gastos: Gasto[]): string {
  const lines = categoryLines(groupByCategory(gastos));
  const total = totalGastos(gastos);
  return `${titulo}\n\n${lines}\n\nTOTAL: *$${escapeCop(total)} COP*`;
}

/** Resumen de una semana del mes (semana N, "días A al B"). */
export function buildWeeklySummaryMessage(
  monthName: string,
  weekNumber: number,
  startDay: number,
  endDay: number,
  gastos: Gasto[]
): string {
  const titulo = `*Resumen semanal de gastos*\nSemana ${weekNumber} de ${monthName} \\(días ${startDay} al ${endDay}\\)`;
  return buildCategorySummary(titulo, gastos);
}

/** Resumen de un mes completo. */
export function buildMonthlySummaryMessage(monthName: string, year: number, gastos: Gasto[]): string {
  const titulo = `*Resumen mensual de gastos*\n${monthName} ${year}`;
  return buildCategorySummary(titulo, gastos);
}

/** Resumen de los gastos del mes en curso (día 1 hasta hoy). */
export function buildCurrentMonthSummaryMessage(monthName: string, year: number, gastos: Gasto[]): string {
  const titulo = `*Resumen de gastos del mes* \\(${monthName} ${year}\\)`;
  return buildCategorySummary(titulo, gastos);
}

/** Resumen anual desglosado por mes, con total del año. */
export function buildAnnualSummaryMessage(year: number, gastos: Gasto[]): string {
  const byMonth = groupByMonth(gastos);
  const lines = [...Array(12).keys()].map(
    (m) => `${escapeMarkdown(MESES[m]!.toUpperCase())}: *$${escapeCop(byMonth.get(m) ?? 0)} COP*`
  );
  const total = totalGastos(gastos);
  return `*Resumen anual de gastos* ${year}\n\n${lines.join('\n')}\n\nTOTAL ANUAL: *$${escapeCop(total)} COP*`;
}