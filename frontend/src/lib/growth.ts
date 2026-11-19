export interface GrowthResult {
  percent: number | null;
  isNew: boolean;
}

export function calculateGrowth(current: number, previous: number): GrowthResult {
  if (previous === 0) {
    return current > 0 ? { percent: null, isNew: true } : { percent: 0, isNew: false };
  }
  const percent = ((current - previous) / previous) * 100;
  return { percent, isNew: false };
}

export function formatGrowthLabel(growth: GrowthResult, newLabel: string): string {
  if (growth.isNew) return newLabel;
  if (growth.percent === null) return "0%";
  const sign = growth.percent > 0 ? "+" : "";
  return `${sign}${growth.percent.toFixed(1)}%`;
}

export function countInRange(dates: Date[], start: Date, end: Date): number {
  return dates.filter((d) => d >= start && d < end).length;
}
