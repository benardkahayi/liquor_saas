// +255712345678 -> 0712 345 678, the way phone numbers are written in Tanzania.
// Other numbers are shown as saved.
export function displayPhone(p: string | null | undefined): string {
  if (!p) return "—";
  return /^\+255\d{9}$/.test(p) ? `0${p.slice(4, 7)} ${p.slice(7, 10)} ${p.slice(10)}` : p;
}
