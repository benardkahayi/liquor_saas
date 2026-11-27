import { z } from "zod";
import { normalizePhone, PHONE_HINT } from "@/common/utils/phone";

export { normalizePhone };
import { BUSINESS_TYPES } from "@/common/constants/businessTypes";

// zod schemas validate incoming request bodies at the "edge" of our API —
// before any business logic runs. If validation fails, we reject the
// request immediately with a clear error, instead of letting bad data
// (e.g. a missing password, an email with no @) travel deeper into the
// system where it's harder to trace back to "the request was malformed."

const phoneSchema = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const p = normalizePhone(v);
    if (!p) {
      ctx.addIssue({ code: "custom", message: PHONE_HINT });
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
