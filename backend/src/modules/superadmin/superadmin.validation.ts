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