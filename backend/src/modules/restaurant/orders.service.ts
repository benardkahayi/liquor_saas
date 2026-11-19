import { Prisma, OrderStatus, PaymentMethod, PaymentStatus } from "@prisma/client";
import { db } from "@/config/db";
import { NotFoundError, ConflictError, BadRequestError } from "@/common/errors/AppError";
import { ACTIVE_ORDER_STATUSES } from "./orders.validation";

type Tx = Prisma.TransactionClient;
const ZERO = new Prisma.Decimal(0);

// Orders in these states still hold their table.
const ACTIVE_STATUSES: OrderStatus[] = [...ACTIVE_ORDER_STATUSES];
const FINAL_STATUSES: OrderStatus[] = ["COMPLETED", "CANCELLED"];

const orderInclude = {
  items: { include: { menuItem: { select: { id: true, name: true, category: true } } } },
  table: { select: { id: true, label: true, status: true } },
  employee: { select: { id: true, fullName: true } },
  customer: { select: { id: true, fullName: true, phone: true } },
  payments: { orderBy: { createdAt: "asc" } },
} satisfies Prisma.OrderInclude;

interface OrderItemInput {
  menuItemId: string;
  quantity: number;
  notes?: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Loads the menu items for an order and builds line items using the
// SERVER-SIDE price. The client never decides what something costs.
export async function buildLineItems(tx: Tx, tenantId: string, items: OrderItemInput[]) {
  const ids = [...new Set(items.map((i) => i.menuItemId))];
  const menuItems = await tx.menuItem.findMany({ where: { id: { in: ids }, tenantId } });
  const byId = new Map(menuItems.map((m) => [m.id, m]));

  return items.map((item) => {
    const menuItem = byId.get(item.menuItemId);
    if (!menuItem) {
      throw new NotFoundError(`Menu item ${item.menuItemId} not found`);
    }
    if (!menuItem.isActive || !menuItem.isAvailable) {
      throw new ConflictError(`"${menuItem.name}" is not available right now`);
    }
    return {
      menuItemId: menuItem.id,
      quantity: item.quantity,
      unitPrice: menuItem.price,
      lineTotal: menuItem.price.mul(item.quantity),
      notes: item.notes ?? null,
    };
  });
}

async function getOrderForUpdate(tx: Tx, tenantId: string, orderId: string) {
  const order = await tx.order.findFirst({ where: { id: orderId, tenantId } });
  if (!order) {
    throw new NotFoundError("Order not found");
  }
  if (FINAL_STATUSES.includes(order.status)) {
    throw new ConflictError("Cannot modify a completed or cancelled order");
  }
  return order;
}

export async function sumPayments(tx: Tx, orderId: string) {
  const agg = await tx.orderPayment.aggregate({ where: { orderId }, _sum: { amount: true } });
  return agg._sum.amount ?? ZERO;
}

export function paymentStatusFor(paid: Prisma.Decimal, total: Prisma.Decimal): PaymentStatus {
  if (paid.lte(0)) return "UNPAID";
  if (paid.gte(total)) return "PAID";
  return "PARTIALLY_PAID";
}

// Recomputes subtotal/total from the items and keeps paymentStatus in sync.
async function recalculateTotals(tx: Tx, orderId: string) {
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
  const items = await tx.orderItem.findMany({ where: { orderId } });
  const subtotal = items.reduce((sum, i) => sum.add(i.lineTotal), ZERO);
  const total = Prisma.Decimal.max(subtotal.sub(order.discount), ZERO);
  const paid = await sumPayments(tx, orderId);

  if (paid.gt(total)) {
    throw new ConflictError(
      `Order total (${total.toFixed(2)}) cannot be less than the amount already paid (${paid.toFixed(2)})`
    );
  }

  await tx.order.update({
    where: { id: orderId },
    data: { subtotal, total, paymentStatus: paymentStatusFor(paid, total) },
  });
}

// Frees the table only when no OTHER order on it is still active.
// (Previously completed orders were counted as "active", so a table could
// never be freed once it had served a single order.)
async function releaseTableIfFree(tx: Tx, tenantId: string, tableId: string) {
  const stillActive = await tx.order.count({
    where: { tenantId, tableId, status: { in: ACTIVE_STATUSES } },
  });
  if (stillActive === 0) {
    await tx.restaurantTable.update({ where: { id: tableId }, data: { status: "AVAILABLE" } });
  }
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export async function createOrder(
  tenantId: string,
  staffId: string,
  data: {
    tableId?: string | null;
    customerId?: string | null;
    items: OrderItemInput[];
    notes?: string | null;
  }
) {
  return db.$transaction(async (tx) => {
    if (data.customerId) {
      const customer = await tx.customer.findFirst({ where: { id: data.customerId, tenantId } });
      if (!customer) throw new NotFoundError("Customer not found");
    }

    if (data.tableId) {
      const table = await tx.restaurantTable.findFirst({ where: { id: data.tableId, tenantId } });
      if (!table) throw new NotFoundError("Table not found");

      // Claim the table atomically: only succeeds if it is still AVAILABLE,
      // so two waiters can't seat different orders on the same table.
      const claimed = await tx.restaurantTable.updateMany({
        where: { id: data.tableId, tenantId, status: "AVAILABLE" },
        data: { status: "OCCUPIED" },
      });
      if (claimed.count === 0) throw new ConflictError("Table is not available");
    }

    const lineItems = await buildLineItems(tx, tenantId, data.items);
    const subtotal = lineItems.reduce((sum, l) => sum.add(l.lineTotal), ZERO);

    return tx.order.create({
      data: {
        tenantId,
        tableId: data.tableId ?? null,
        customerId: data.customerId ?? null,
        employeeId: staffId,
        status: "OPEN",
        paymentStatus: subtotal.gt(0) ? "UNPAID" : "PAID",
        subtotal,
        discount: 0,
        total: subtotal,
        notes: data.notes ?? null,
        items: { create: lineItems },
      },
      include: orderInclude,
    });
  });
}

export async function listOrders(
  tenantId: string,
  filters: {
    page: number;
    pageSize: number;
    status?: OrderStatus;
    tableId?: string;
    customerId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }
) {
  const where: Prisma.OrderWhereInput = {
    tenantId,
    ...(filters.status && { status: filters.status }),
    ...(filters.tableId && { tableId: filters.tableId }),
    ...(filters.customerId && { customerId: filters.customerId }),
    ...((filters.dateFrom || filters.dateTo) && {
      createdAt: {
        ...(filters.dateFrom && { gte: filters.dateFrom }),
        ...(filters.dateTo && { lte: filters.dateTo }),
      },
    }),
  };

  const [items, total] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: orderInclude,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    db.order.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      total,
      totalPages: Math.ceil(total / filters.pageSize),
    },
  };
}

export async function getOrderById(tenantId: string, orderId: string) {
  const order = await db.order.findFirst({
    where: { id: orderId, tenantId },
    include: orderInclude,
  });
  if (!order) throw new NotFoundError("Order not found");
  return order;
}

export async function getActiveOrdersByTable(tenantId: string, tableId: string) {
  const table = await db.restaurantTable.findFirst({ where: { id: tableId, tenantId } });
  if (!table) throw new NotFoundError("Table not found");

  return db.order.findMany({
    where: { tenantId, tableId, status: { in: ACTIVE_STATUSES } },
    include: orderInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function updateOrderStatus(tenantId: string, orderId: string, newStatus: OrderStatus) {
  return db.$transaction(async (tx) => {
    const order = await getOrderForUpdate(tx, tenantId, orderId);

    await tx.order.update({ where: { id: orderId }, data: { status: newStatus } });

    // Same transaction: if freeing the table fails, the status change rolls back too.
    if (FINAL_STATUSES.includes(newStatus) && order.tableId) {
      await releaseTableIfFree(tx, tenantId, order.tableId);
    }

    return tx.order.findUniqueOrThrow({ where: { id: orderId }, include: orderInclude });
  });
}

export async function addItemToOrder(tenantId: string, orderId: string, item: OrderItemInput) {
  return db.$transaction(async (tx) => {
    await getOrderForUpdate(tx, tenantId, orderId);
    const [line] = await buildLineItems(tx, tenantId, [item]);
    await tx.orderItem.create({ data: { ...line, orderId } });
    await recalculateTotals(tx, orderId);
    return tx.order.findUniqueOrThrow({ where: { id: orderId }, include: orderInclude });
  });
}

// Removes by item ID, not list position — positions shift as items are
// added/removed and could delete the wrong dish.
export async function removeItemFromOrder(tenantId: string, orderId: string, itemId: string) {
  return db.$transaction(async (tx) => {
    await getOrderForUpdate(tx, tenantId, orderId);

    const deleted = await tx.orderItem.deleteMany({ where: { id: itemId, orderId } });
    if (deleted.count === 0) throw new NotFoundError("Order item not found");

    const remaining = await tx.orderItem.count({ where: { orderId } });
    if (remaining === 0) {
      throw new BadRequestError("An order must keep at least one item — cancel the order instead");
    }

    await recalculateTotals(tx, orderId);
    return tx.order.findUniqueOrThrow({ where: { id: orderId }, include: orderInclude });
  });
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export async function recordPayment(
  tenantId: string,
  orderId: string,
  method: PaymentMethod,
  amount: number
) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findFirst({ where: { id: orderId, tenantId } });
    if (!order) throw new NotFoundError("Order not found");
    if (order.status === "CANCELLED") throw new ConflictError("Cannot take payment for a cancelled order");
    if (order.paymentStatus === "PAID") throw new ConflictError("Order is already fully paid");

    const paymentAmount = new Prisma.Decimal(amount);
    const alreadyPaid = await sumPayments(tx, orderId);
    const balance = order.total.sub(alreadyPaid);

    if (paymentAmount.gt(balance)) {
      throw new BadRequestError(
        `Payment (${paymentAmount.toFixed(2)}) is more than the balance due (${balance.toFixed(2)})`
      );
    }

    const payment = await tx.orderPayment.create({
      data: { tenantId, orderId, method, amount: paymentAmount },
    });

    const paid = alreadyPaid.add(paymentAmount);
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: { paymentStatus: paymentStatusFor(paid, order.total) },
      include: orderInclude,
    });

    return { payment, order: updatedOrder, balance: order.total.sub(paid) };
  });
}

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

// Manual override, e.g. guests left. Blocked only by orders that are still
// OPEN / IN_PROGRESS / SERVED — finished orders no longer count.
export async function markTableAvailable(tenantId: string, tableId: string) {
  const table = await db.restaurantTable.findFirst({ where: { id: tableId, tenantId } });
  if (!table) throw new NotFoundError("Table not found");

  const activeOrders = await db.order.count({
    where: { tenantId, tableId, status: { in: ACTIVE_STATUSES } },
  });
  if (activeOrders > 0) {
    throw new ConflictError(
      "This table still has an open order. Complete or cancel it first."
    );
  }

  return db.restaurantTable.update({ where: { id: tableId }, data: { status: "AVAILABLE" } });
}
