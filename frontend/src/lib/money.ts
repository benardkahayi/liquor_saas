export function toNum(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === "number" ? value : Number(value);
}

export function money(value: number | string | null | undefined): string {
  return `$${toNum(value)}`;
}
