import { Prisma } from '@prisma/client'
import { db } from '@/config/db'
import { ConflictError, NotFoundError } from '@/common/errors/AppError'

// ---------------------------------------------------------------------------
// MENU ITEMS
// ---------------------------------------------------------------------------

interface CreateMenuItemInput {
  name: string
  category: string
  description?: string
  price: number
  isAvailable: boolean
}

export async function createMenuItem (
  tenantId: string,
  input: CreateMenuItemInput
) {
  return db.menuItem.create({ data: { ...input, tenantId } })
}

interface ListMenuItemsInput {
  page: number
  pageSize: number
  search?: string
  category?: string
  includeInactive: boolean
}

export async function listMenuItems (
  tenantId: string,
  input: ListMenuItemsInput
) {
  const where: Prisma.MenuItemWhereInput = {
    tenantId,
    ...(input.includeInactive ? {} : { isActive: true }),
    ...(input.search && {
      name: { contains: input.search, mode: 'insensitive' }
    }),
    ...(input.category && { category: input.category })
  }

  const [items, total] = await Promise.all([
    db.menuItem.findMany({
      where,
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      orderBy: [{ category: 'asc' }, { name: 'asc' }]
    }),
    db.menuItem.count({ where })
  ])

  return {
    items,
    pagination: {
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages: Math.ceil(total / input.pageSize)
    }
  }
}

export async function listMenuCategories (tenantId: string) {
  const rows = await db.menuItem.findMany({
    where: { tenantId, isActive: true },
    select: { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' }
  })
  return rows.map(r => r.category)
}

export async function updateMenuItem (
  tenantId: string,
  menuItemId: string,
  input: Partial<CreateMenuItemInput> & { isActive?: boolean }
) {
  const existing = await db.menuItem.findFirst({
    where: { id: menuItemId, tenantId }
  })
  if (!existing) {
    throw new NotFoundError('Menu item not found')
  }

  return db.menuItem.update({ where: { id: menuItemId }, data: input })
}

// "Delete" is a soft delete: the item is kept so historical orders that
// reference it (order_items.menuItemId is ON DELETE RESTRICT) stay intact,
// but it no longer appears on the menu.
export async function deactivateMenuItem (tenantId: string, menuItemId: string) {
  const existing = await db.menuItem.findFirst({
    where: { id: menuItemId, tenantId }
  })
  if (!existing) {
    throw new NotFoundError('Menu item not found')
  }

  return db.menuItem.update({
    where: { id: menuItemId },
    data: { isActive: false, isAvailable: false }
  })
}

// ---------------------------------------------------------------------------
// TABLES
// ---------------------------------------------------------------------------

interface CreateTableInput {
  label: string
  capacity: number
}

export async function createTable (tenantId: string, input: CreateTableInput) {
  const duplicate = await db.restaurantTable.findFirst({
    where: { tenantId, label: input.label }
  })
  if (duplicate) {
    throw new ConflictError(`A table labelled "${input.label}" already exists`)
  }

  return db.restaurantTable.create({ data: { ...input, tenantId } })
}

export async function listTables (tenantId: string) {
  const tables = await db.restaurantTable.findMany({
    where: { tenantId },
    orderBy: { label: 'asc' },
    include: {
      orders: {
        where: { status: { in: ['OPEN', 'IN_PROGRESS', 'SERVED'] } },
        select: { id: true, total: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  })

  return tables.map(table => ({
    id: table.id,
    label: table.label,
    capacity: table.capacity,
    status: table.status,
    activeOrder: table.orders[0] ?? null
  }))
}

export async function updateTable (
  tenantId: string,
  tableId: string,
  input: Partial<CreateTableInput>
) {
  const existing = await db.restaurantTable.findFirst({
    where: { id: tableId, tenantId }
  })
  if (!existing) {
    throw new NotFoundError('Table not found')
  }

  if (input.label && input.label !== existing.label) {
    const duplicate = await db.restaurantTable.findFirst({
      where: { tenantId, label: input.label, id: { not: tableId } }
    })
    if (duplicate) {
      throw new ConflictError(
        `A table labelled "${input.label}" already exists`
      )
    }
  }

  return db.restaurantTable.update({ where: { id: tableId }, data: input })
}

export async function deleteTable (tenantId: string, tableId: string) {
  const existing = await db.restaurantTable.findFirst({
    where: { id: tableId, tenantId }
  })
  if (!existing) {
    throw new NotFoundError('Table not found')
  }

  const activeOrders = await db.order.count({
    where: {
      tenantId,
      tableId,
      status: { in: ['OPEN', 'IN_PROGRESS', 'SERVED'] }
    }
  })
  if (activeOrders > 0) {
    throw new ConflictError(
      'This table has active orders and cannot be removed'
    )
  }

  // Past orders keep their record with tableId set to NULL (ON DELETE SET NULL).
  return db.restaurantTable.delete({ where: { id: tableId } })
}
