import { z } from "zod";

export const createSupplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required").max(100),
  phone: z.string().optional(),
  email: z.string().email("Invalid email address").optional(),
  address: z.string().max(200).optional(),
});

export const updateSupplierSchema = createSupplierSchema.partial();

export const listSuppliersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
});

export const recordPaymentSchema = z.object({
  amount: z.number().positive("Payment amount must be greater than zero"),
});