import { z } from "zod";

export const createExpenseSchema = z.object({
  category: z.string().min(1, "Category is required").max(50),
  amount: z.number().positive("Amount must be greater than zero"),
  description: z.string().max(500).optional(),
  date: z.coerce.date().optional(),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export const listExpensesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  category: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});