import { z } from "zod";
import { BUSINESS_TYPES } from "@/common/constants/businessTypes";

// zod schemas validate incoming request bodies at the "edge" of our API —
// before any business logic runs. If validation fails, we reject the
// request immediately with a clear error, instead of letting bad data
// (e.g. a missing password, an email with no @) travel deeper into the
// system where it's harder to trace back to "the request was malformed."

// Tanzanian mobile numbers in any common form (0712 345 678, 255712345678,
// +255 712 345 678) become +255712345678. Other countries: +<code><number>.
export function normalizePhone(raw: string): string | null {
  const s = raw.replace(/[\s\-().]/g, "");
  if (/^0[67]\d{8}$/.test(s)) return "+255" + s.slice(1);
  if (/^255[67]\d{8}$/.test(s)) return "+" + s;
  if (/^\+255[67]\d{8}$/.test(s)) return s;
  if (/^\+(?!255)\d{9,15}$/.test(s)) return s;
  return null;
}

const phoneSchema = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const p = normalizePhone(v);
    if (!p) {
      ctx.addIssue({ code: "custom", message: "Enter a valid phone number, e.g. 0712 345 678" });
      return z.NEVER;
    }
    return p;
  });

export const registerSchema = z.object({
  businessName: z.string().trim().min(2, "Business name is too short"),
  ownerEmail: z.string().trim().toLowerCase().email("Must be a valid email"),
  ownerPhone: phoneSchema,
  ownerPassword: z.string().min(8, "Password must be at least 8 characters"),
  ownerFullName: z.string().min(2, "Full name is too short"),
  // What kind of business — decides which menu and dashboard they get.
  industry: z.enum(BUSINESS_TYPES).default("liquor_store"),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Must be a valid email"),
  password: z.string().min(1, "Password is required"),
});

// Body is optional now — the refresh token is normally read from the
// httpOnly cookie set at login. The body field stays supported for any
// non-browser client that can't hold cookies.
export const refreshSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Must be a valid email"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20, "This reset link is incomplete"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});
