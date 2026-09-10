import { z } from "zod";

export const createAdjustmentSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .refine((val) => val !== 0, "Quantity cannot be zero"),
  reason: z.string().min(3, "Please provide a reason for this adjustment"),
});

export const listHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});