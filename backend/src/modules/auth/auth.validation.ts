import { z } from "zod";

// zod schemas validate incoming request bodies at the "edge" of our API —
// before any business logic runs. If validation fails, we reject the
// request immediately with a clear error, instead of letting bad data
// (e.g. a missing password, an email with no @) travel deeper into the
// system where it's harder to trace back to "the request was malformed."

export const registerSchema = z.object({
  businessName: z.string().min(2, "Business name is too short"),
  ownerEmail: z.string().email("Must be a valid email"),
  ownerPassword: z.string().min(8, "Password must be at least 8 characters"),
  ownerFullName: z.string().min(2, "Full name is too short"),
});

export const loginSchema = z.object({
  email: z.string().email("Must be a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});