import { z } from "zod";

// Values here MUST match the Prisma enums in schema.prisma (OrderStatus,
// PaymentMethod). They used to be lowercase ("pending", "preparing"),
// which never matched the database, so every status update failed.
export const ORDER_STATUSES = ["OPEN", "IN_PROGRESS", "SERVED", "COMPLETED", "CANCELLED"] as const;
export const ACTIVE_ORDER_STATUSES = ["OPEN", "IN_PROGRESS", "SERVED"] as const;
export const PAYMENT_METHODS = ["CASH", "CARD", "MOBILE_MONEY", "OTHER"] as const;

// Prices are NEVER accepted from the client — the server always uses the
// menu item's current price. Only the item and quantity come from the request.
// "specialInstructions" is still accepted as an alias for older clients.
export const orderItemInputSchema = z
  .object({
    menuItemId: z.string().uuid("Invalid menu item ID"),
    quantity: z.number().int().positive("Quantity must be at least 1"),
    notes: z.string().max(300).optional(),
    specialInstructions: z.string().max(300).optional(),
  })
  .transform(({ specialInstructions, notes, ...rest }) => ({
    ...rest,
    notes: notes ?? specialInstructions ?? null,
  }));

// tableId is optional so takeaway / counter orders work.
export const createOrderSchema = z.object({
  tableId: z.string().uuid("Invalid table ID").nullish(),
  customerId: z.string().uuid("Invalid customer ID").nullish(),
  items: z.array(orderItemInputSchema).min(1, "Order must have at least one item"),
  notes: z.string().max(500).nullish(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});

export const recordPaymentSchema = z.object({
  method: z.enum(PAYMENT_METHODS),
  amount: z.number().positive("Amount must be greater than 0"),
});

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(ORDER_STATUSES).optional(),
  tableId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export const activeOrdersQuerySchema = z.object({
  tableId: z.string().uuid("tableId query parameter is required"),
});
