import { z } from 'zod'

// ---------------------------------------------------------------------------
// MENU ITEMS
// ---------------------------------------------------------------------------

export const createMenuItemSchema = z.object({
  name: z.string().min(1, 'Item name is required').max(100),
  category: z.string().min(1, 'Category is required').max(50),
  description: z.string().max(300).optional(),
  price: z.number().positive('Price must be greater than zero'),
  isAvailable: z.boolean().default(true)
})

export const updateMenuItemSchema = createMenuItemSchema.partial().extend({
  isActive: z.boolean().optional()
})

export const listMenuItemsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
  search: z.string().optional(),
  category: z.string().optional(),
  // "all" includes deactivated items; default list hides them.
  includeInactive: z.coerce.boolean().default(false)
})

// ---------------------------------------------------------------------------
// TABLES
// ---------------------------------------------------------------------------

export const createTableSchema = z.object({
  label: z.string().min(1, 'Table label is required').max(50),
  capacity: z.number().int().positive().max(100).default(4)
})

export const updateTableSchema = createTableSchema.partial()
