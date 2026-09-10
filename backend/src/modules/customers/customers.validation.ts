import { z } from "zod";

export const createCustomerSchema = z.object({
  fullName: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters long"),
  email: z.string().email("Invalid email address").optional(),
  phone: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number")
    .optional(),
  address: z.string().max(200, "Address must be at most 200 characters long").optional(), 
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const listCustomerQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

