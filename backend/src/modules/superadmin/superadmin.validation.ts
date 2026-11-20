import { z } from "zod";

export const listTenantsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(["ACTIVE", "SUSPENDED", "TRIAL", "CANCELLED"]).optional(),
  search: z.string().optional(),
});

export const updateTenantStatusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "TRIAL", "CANCELLED"]),
});

export const setTenantPlanSchema = z.object({
  plan: z.enum(["FREE", "STARTER", "PRO"]),
});

export const listSubscriptionsQuerySchema = z.object({
  plan: z.enum(["FREE", "STARTER", "PRO"]).optional(),
  // "expiring" = paid, ends within 7 days; "expired" = paid, end date passed
  due: z.enum(["expiring", "expired"]).optional(),
  search: z.string().trim().optional(),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
  search: z.string().trim().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});
