import { Router } from 'express'
import { requireAuth } from '@/middleware/auth'
import { resolveTenant } from '@/middleware/tenant'
import { requirePermission } from '@/middleware/rbac'
import {
  createMenuItemHandler,
  listMenuItemsHandler,
  listMenuCategoriesHandler,
  updateMenuItemHandler,
  deactivateMenuItemHandler,
  setMenuItemImageHandler,
  removeMenuItemImageHandler,
  getMenuItemImageHandler,
  createTableHandler,
  listTablesHandler,
  updateTableHandler,
  deleteTableHandler,
  createOrderHandler,
  listOrdersHandler,
  getActiveOrdersHandler,
  getOrderHandler,
  updateOrderStatusHandler,
  addItemToOrderHandler,
  removeItemFromOrderHandler,
  recordPaymentHandler,
  markTableAvailableHandler
} from './restaurant.controller'
import {
  counterCheckoutHandler,
  listDebtorsHandler,
  getCustomerDebtHandler,
  recordDebtPaymentHandler,
  daybookHandler
} from './counter.controller'

const router = Router()

router.use(requireAuth, resolveTenant)

// Menu — viewing the menu is needed by anyone who can create orders,
// so it shares the orders.view permission rather than menu.manage.
router.get(
  '/menu',
  requirePermission('restaurant.orders.view'),
  listMenuItemsHandler
)
router.get(
  '/menu/categories',
  requirePermission('restaurant.orders.view'),
  listMenuCategoriesHandler
)
router.post(
  '/menu',
  requirePermission('restaurant.menu.manage'),
  createMenuItemHandler
)
router.put(
  '/menu/:id',
  requirePermission('restaurant.menu.manage'),
  updateMenuItemHandler
)
router.delete(
  '/menu/:id',
  requirePermission('restaurant.menu.manage'),
  deactivateMenuItemHandler
)

// Menu photos
router.get(
  '/menu/:id/image',
  requirePermission('restaurant.orders.view'),
  getMenuItemImageHandler
)
router.put(
  '/menu/:id/image',
  requirePermission('restaurant.menu.manage'),
  setMenuItemImageHandler
)
router.delete(
  '/menu/:id/image',
  requirePermission('restaurant.menu.manage'),
  removeMenuItemImageHandler
)

// Tables — viewing table status is part of taking orders; managing the
// table list itself is restricted.
router.get(
  '/tables',
  requirePermission('restaurant.orders.view'),
  listTablesHandler
)
router.post(
  '/tables',
  requirePermission('restaurant.tables.manage'),
  createTableHandler
)
router.put(
  '/tables/:id',
  requirePermission('restaurant.tables.manage'),
  updateTableHandler
)
router.delete(
  '/tables/:id',
  requirePermission('restaurant.tables.manage'),
  deleteTableHandler
)

// Orders — uses permission keys that already exist in auth.service.ts
// (the old 'restaurant.orders.manage' key was never created, so every
// tenant user got 403).
router.post(
  '/orders',
  requirePermission('restaurant.orders.create'),
  createOrderHandler
)
router.get(
  '/orders',
  requirePermission('restaurant.orders.view'),
  listOrdersHandler
)
router.get(
  '/orders/active',
  requirePermission('restaurant.orders.view'),
  getActiveOrdersHandler
)
router.get(
  '/orders/:id',
  requirePermission('restaurant.orders.view'),
  getOrderHandler
)
router.patch(
  '/orders/:id/status',
  requirePermission('restaurant.orders.create'),
  updateOrderStatusHandler
)
router.post(
  '/orders/:id/items',
  requirePermission('restaurant.orders.create'),
  addItemToOrderHandler
)
router.delete(
  '/orders/:id/items/:itemId',
  requirePermission('restaurant.orders.create'),
  removeItemFromOrderHandler
)
router.post(
  '/orders/:id/payments',
  requirePermission('restaurant.payments.record'),
  recordPaymentHandler
)
router.patch(
  '/tables/:id/available',
  requirePermission('restaurant.tables.manage'),
  markTableAvailableHandler
)

// Counter (cashier screen): one call takes the order, the money and gives
// change; anything unpaid becomes a debt under the customer's name.
router.post(
  '/counter/checkout',
  requirePermission('restaurant.payments.record'),
  counterCheckoutHandler
)

// Debts (madeni)
router.get(
  '/debts',
  requirePermission('restaurant.orders.view'),
  listDebtorsHandler
)
router.get(
  '/debts/:customerId',
  requirePermission('restaurant.orders.view'),
  getCustomerDebtHandler
)
router.post(
  '/debts/:customerId/payments',
  requirePermission('restaurant.payments.record'),
  recordDebtPaymentHandler
)

// Daily book: foods sold, money by method, debts given & collected
router.get(
  '/daybook',
  requirePermission('restaurant.orders.view'),
  daybookHandler
)

export default router
