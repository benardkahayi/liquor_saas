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

export const PAYMENT_METHODS = ["MPESA", "MIXX_BY_YAS", "AIRTEL_MONEY", "HALOPESA", "BANK", "CASH", "OTHER"] as const;
// These always come with a transaction ID on the customer's SMS/receipt.
const NEEDS_REFERENCE = new Set(["MPESA", "MIXX_BY_YAS", "AIRTEL_MONEY", "HALOPESA", "BANK"]);

export const paymentSchema = z
  .object({
    amount: z.coerce.number().int().min(0).max(100_000_000),
    method: z.enum(PAYMENT_METHODS),
    reference: z.string().trim().max(80).optional(),
    note: z.string().trim().max(300).optional(),
    paidAt: z.coerce
      .date()
      .refine((d) => d.getTime() <= Date.now() + 5 * 60 * 1000, "Payment date can't be in the future")
      .optional(),
  })
  .refine((p) => !NEEDS_REFERENCE.has(p.method) || !!p.reference, {
    message: "Enter the transaction ID from the payment message",
    path: ["reference"],
  });

export const setTenantPlanSchema = z.object({
  plan: z.enum(["FREE", "STARTER", "PRO"]),
  payment: paymentSchema.optional(),
});

export const listPaymentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
  tenantId: z.string().uuid().optional(),
  search: z.string().trim().optional(),
});

export const paymentsOverviewQuerySchema = z.object({
  range: z.enum(["7D", "30D", "3M", "1Y"]).default("30D"),
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

export const deleteTenantSchema = z.object({
  confirmName: z.string().min(1, "Type the business name to confirm"),
});
