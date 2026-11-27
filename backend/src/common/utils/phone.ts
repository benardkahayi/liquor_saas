// Phone numbers as people type them in Tanzania: 0712 345 678, 0712-345-678,
// 255712345678 or +255 712 345 678 all become +255712345678. Numbers from
// other countries are kept as +<country code><number>. Returns null when it
// isn't a phone number.
export function normalizePhone(raw: string): string | null {
  const s = raw.replace(/[\s\-().]/g, "");
  if (/^0[67]\d{8}$/.test(s)) return "+255" + s.slice(1);
  if (/^255[67]\d{8}$/.test(s)) return "+" + s;
  if (/^\+255[67]\d{8}$/.test(s)) return s;
  if (/^\+(?!255)\d{9,15}$/.test(s)) return s;
  return null;
}

export const PHONE_HINT = "Enter a valid phone number, e.g. 0712 345 678";
