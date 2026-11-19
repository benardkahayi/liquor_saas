import { db } from "@/config/db";

// "ABC Wines & Spirits" -> "abc-wines-spirits"
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Appends -2, -3, ... until the slug is free. Reused by anything that
// creates a tenant (currently just registerTenant).
export async function generateUniqueSlug(businessName: string): Promise<string> {
  const base = slugify(businessName) || "business";
  let candidate = base;
  let suffix = 2;

  while (await db.tenant.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${base}-${suffix}`;
    suffix++;
  }

  return candidate;
}
