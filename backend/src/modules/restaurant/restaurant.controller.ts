import { Request, Response, NextFunction } from 'express'
import {
  createMenuItemSchema,
  updateMenuItemSchema,
  listMenuItemsQuerySchema,
  menuItemImageSchema,
  createTableSchema,
  updateTableSchema
} from './restaurant.validation'
import {
  createOrderSchema,
  updateOrderStatusSchema,
  orderItemInputSchema,
  recordPaymentSchema,
  listOrdersQuerySchema,
  activeOrdersQuerySchema
} from './orders.validation'
import * as restaurantService from './restaurant.service'
import * as restaurantOrdersService from './orders.service'

function paramId (value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value
}

// ---------------------------------------------------------------------------
// MENU ITEMS
// ---------------------------------------------------------------------------

export async function createMenuItemHandler (
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const input = createMenuItemSchema.parse(req.body)
    const item = await restaurantService.createMenuItem(
      req.user!.tenantId!,
      input
    )
    res.status(201).json({ data: item })
  } catch (err) {
    next(err)
  }
}

export async function listMenuItemsHandler (
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const query = listMenuItemsQuerySchema.parse(req.query)
    const result = await restaurantService.listMenuItems(
      req.user!.tenantId!,
      query
    )
    res.status(200).json(result)
  } catch (err) {
    next(err)
  }
}

export async function listMenuCategoriesHandler (
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const categories = await restaurantService.listMenuCategories(
      req.user!.tenantId!
    )
    res.status(200).json({ data: categories })
  } catch (err) {
    next(err)
  }
}

export async function updateMenuItemHandler (
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const input = updateMenuItemSchema.parse(req.body)
    const item = await restaurantService.updateMenuItem(
      req.user!.tenantId!,
      paramId(req.params.id),
      input
    )
    res.status(200).json({ data: item })
  } catch (err) {
    next(err)
  }
}

export async function deactivateMenuItemHandler (
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    await restaurantService.deactivateMenuItem(
      req.user!.tenantId!,
      paramId(req.params.id)
    )
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}

// ---------------------------------------------------------------------------
// MENU ITEM PHOTOS
// ---------------------------------------------------------------------------

export async function setMenuItemImageHandler (
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { dataUrl } = menuItemImageSchema.parse(req.body)
    const item = await restaurantService.setMenuItemImage(
      req.user!.tenantId!,
      paramId(req.params.id),
      dataUrl
    )
    res.status(200).json({ data: item })
  } catch (err) {
    next(err)
  }
}

export async function removeMenuItemImageHandler (
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const item = await restaurantService.removeMenuItemImage(
      req.user!.tenantId!,
      paramId(req.params.id)
    )
    res.status(200).json({ data: item })
  } catch (err) {
    next(err)
  }
}

export async function getMenuItemImageHandler (
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { bytes, mime } = await restaurantService.getMenuItemImage(
      req.user!.tenantId!,
      paramId(req.params.id)
    )
    // The URL carries ?v=<imageUpdatedAt>, so a new photo gets a new URL and
    // the browser can keep this one for a long time. "private" stops shared
    // caches (e.g. Vercel's) from storing one business's photo for others.
    res.set('Content-Type', mime)
    res.set('Cache-Control', 'private, max-age=31536000, immutable')
    res.set('X-Content-Type-Options', 'nosniff')
    res.status(200).send(bytes)
  } catch (err) {
    next(err)
  }
}

// ---------------------------------------------------------------------------
// TABLES
// ---------------------------------------------------------------------------

export async function createTableHandler (
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const input = createTableSchema.parse(req.body)
    const table = await restaurantService.createTable(
      req.user!.tenantId!,
      input
    )
    res.status(201).json({ data: table })
  } catch (err) {
    next(err)
  }
}

export async function listTablesHandler (
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const tables = await restaurantService.listTables(req.user!.tenantId!)
    res.status(200).json({ data: tables })
  } catch (err) {
    next(err)
  }
}

export async function updateTableHandler (
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const input = updateTableSchema.parse(req.body)
    const table = await restaurantService.updateTable(
      req.user!.tenantId!,
      paramId(req.params.id),
      input
    )
    res.status(200).json({ data: table })
  } catch (err) {
    next(err)
  }
}

export async function deleteTableHandler (
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    await restaurantService.deleteTable(
      req.user!.tenantId!,
      paramId(req.params.id)
    )
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}

// ---------------------------------------------------------------------------
// ORDERS
// ---------------------------------------------------------------------------

export async function createOrderHandler (
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Only item IDs + quantities come from the client. Prices are looked up
    // from the menu on the server (they used to be hard-coded to 0 here).
    const input = createOrderSchema.parse(req.body)
    const order = await restaurantOrdersService.createOrder(
      req.user!.tenantId!,
      req.user!.userId,
      input
    )
    res.status(201).json({ data: order })
  } catch (err) {
    next(err)
  }
}

export async function listOrdersHandler (
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const query = listOrdersQuerySchema.parse(req.query)
    const result = await restaurantOrdersService.listOrders(
      req.user!.tenantId!,
      query
    )
    res.status(200).json(result)
  } catch (err) {
    next(err)
  }
}

export async function getActiveOrdersHandler (
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { tableId } = activeOrdersQuerySchema.parse(req.query)
    const orders = await restaurantOrdersService.getActiveOrdersByTable(
      req.user!.tenantId!,
      tableId
    )
    res.status(200).json({ data: orders })
  } catch (err) {
    next(err)
  }
}

export async function getOrderHandler (
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const order = await restaurantOrdersService.getOrderById(
      req.user!.tenantId!,
      paramId(req.params.id)
    )
    res.status(200).json({ data: order })
  } catch (err) {
    next(err)
  }
}

export async function updateOrderStatusHandler (
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { status } = updateOrderStatusSchema.parse(req.body)
    const order = await restaurantOrdersService.updateOrderStatus(
      req.user!.tenantId!,
      paramId(req.params.id),
      status
    )
    res.status(200).json({ data: order })
  } catch (err) {
    next(err)
  }
}

export async function addItemToOrderHandler (
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const item = orderItemInputSchema.parse(req.body)
    const order = await restaurantOrdersService.addItemToOrder(
      req.user!.tenantId!,
      paramId(req.params.id),
      item
    )
    res.status(201).json({ data: order })
  } catch (err) {
    next(err)
  }
}

export async function removeItemFromOrderHandler (
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const order = await restaurantOrdersService.removeItemFromOrder(
      req.user!.tenantId!,
      paramId(req.params.id),
      paramId(req.params.itemId)
    )
    res.status(200).json({ data: order })
  } catch (err) {
    next(err)
  }
}

export async function recordPaymentHandler (
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { method, amount } = recordPaymentSchema.parse(req.body)
    const result = await restaurantOrdersService.recordPayment(
      req.user!.tenantId!,
      paramId(req.params.id),
      method,
      amount
    )
    res.status(201).json({ data: result })
  } catch (err) {
    next(err)
  }
}

export async function markTableAvailableHandler (
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const table = await restaurantOrdersService.markTableAvailable(
      req.user!.tenantId!,
      paramId(req.params.id)
    )
    res.status(200).json({ data: table })
  } catch (err) {
    next(err)
  }
}
