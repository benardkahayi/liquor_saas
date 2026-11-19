import { Prisma } from '@prisma/client'
import { db } from '@/config/db'
import { BadRequestError, ConflictError, NotFoundError } from '@/common/errors/AppError'
import { checkMenuItemLimit } from '@/modules/subscriptions/subscriptions.service'

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
  await checkMenuItemLimit(tenantId)
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

  if (input.isActive === true && !existing.isActive) {
    await checkMenuItemLimit(tenantId)
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
// MENU ITEM PHOTOS
// ---------------------------------------------------------------------------

const MAX_IMAGE_BYTES = 700 * 1024

// Checks the first bytes of the file too, not just the label in the data
// URL, so something that is not really a picture is refused.
function detectImageType (bytes: Buffer): string | null {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }
  if (
    bytes.length > 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png'
  }
  if (
    bytes.length > 12 &&
    bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
    bytes.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp'
  }
  return null
}

export function parseImageDataUrl (dataUrl: string): { bytes: Buffer, mime: string } {
  const match = /^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl)
  if (!match) {
    throw new BadRequestError('Photo must be a JPEG, PNG or WebP image')
  }
  const bytes = Buffer.from(match[1], 'base64')
  if (bytes.length === 0) {
    throw new BadRequestError('Photo is empty')
  }
  if (bytes.length > MAX_IMAGE_BYTES) {
    throw new BadRequestError('Photo is too large — please choose a smaller one')
  }
  const mime = detectImageType(bytes)
  if (!mime) {
    throw new BadRequestError('That file is not a valid photo')
  }
  return { bytes, mime }
}

async function findOwnMenuItem (tenantId: string, menuItemId: string) {
  const existing = await db.menuItem.findFirst({
    where: { id: menuItemId, tenantId },
    select: { id: true }
  })
  if (!existing) {
    throw new NotFoundError('Menu item not found')
  }
}

export async function setMenuItemImage (
  tenantId: string,
  menuItemId: string,
  dataUrl: string
) {
  const { bytes, mime } = parseImageDataUrl(dataUrl)
  await findOwnMenuItem(tenantId, menuItemId)
  return db.menuItem.update({
    where: { id: menuItemId },
    data: { image: new Uint8Array(bytes), imageMime: mime, imageUpdatedAt: new Date() }
  })
}

export async function removeMenuItemImage (tenantId: string, menuItemId: string) {
  await findOwnMenuItem(tenantId, menuItemId)
  return db.menuItem.update({
    where: { id: menuItemId },
    data: { image: null, imageMime: null, imageUpdatedAt: null }
  })
}

export async function getMenuItemImage (tenantId: string, menuItemId: string) {
  const row = await db.menuItem.findFirst({
    where: { id: menuItemId, tenantId },
    select: { image: true, imageMime: true }
  })
  if (!row || !row.image || !row.imageMime) {
    throw new NotFoundError('Photo not found')
  }
  return { bytes: Buffer.from(row.image), mime: row.imageMime }
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
