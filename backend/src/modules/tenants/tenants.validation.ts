import { z } from "zod";
import { BUSINESS_TYPES } from "@/common/constants/businessTypes";

export const updateTenantSettingsSchema = z.object({
  businessName: z.string().min(2).max(100).optional(),
  logoUrl: z
    .string()
    .url()
    .refine((u) => u.startsWith("https://"), "Logo link must start with https://")
    .optional(),
  phone: z.string().optional(),
  address: z.string().max(200).optional(),
  currency: z.string().length(3, "Use a 3-letter currency code, e.g. USD").optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a hex color like #0F6E56")
    .optional(),
  receiptFooter: z.string().max(300).optional(),
  enabledModules: z.array(z.string()).optional(),
  industry: z.enum(BUSINESS_TYPES).optional(),
});