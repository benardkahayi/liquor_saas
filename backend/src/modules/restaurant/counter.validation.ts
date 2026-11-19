import { z } from "zod";
import { orderItemInputSchema, PAYMENT_METHODS } from "./orders.validation";

// A customer is needed whenever part of the bill is left unpaid (a debt).
// The cashier either picks an existing customer or types name + phone,
// just like writing it in the back of the book.
const newCustomerSchema = z.object({
  fullName: z.string().trim().min(2, "Customer name is required").max(100),
  phone: z
    .string()
    .trim()
    .min(9, "Enter a valid phone number")
    .max(20)
    .regex(/^[+\d\s-]+$/, "Phone can only contain digits, spaces, + and -"),
});

export const counterCheckoutSchema = z
  .object({
    items: z.array(orderItemInputSchema).min(1, "Add at least one item"),
    method: z.enum(PAYMENT_METHODS),
    // What the customer actually handed over. Can be more than the bill
    // (cash → change), equal, less (rest becomes debt) or 0 (all on credit).
    amountReceived: z.number().min(0, "Amount cannot be negative"),
    customerId: z.string().uuid().optional(),
    newCustomer: newCustomerSchema.optional(),
    notes: z.string().max(500).optional(),
  })
  .refine((d) => !(d.customerId && d.newCustomer), {
    message: "Choose an existing customer or enter a new one, not both",
    path: ["customerId"],
  });

export const debtPaymentSchema = z.object({
  method: z.enum(PAYMENT_METHODS),
  amountReceived: z.number().positive("Amount must be greater than 0"),
});

export const listDebtorsQuerySchema = z.object({
  search: z.string().trim().optional(),
});

export const daybookQuerySchema = z.object({
  // Business day, YYYY-MM-DD. Defaults to today (East Africa Time).
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .optional(),
});
