// Counter / "daftari" features for restaurants: one cashier takes the order,
// receives money, gives change, and anything not paid is written down as a
// debt (deni) under the customer's name and phone — the same things owners
// used to write in their exercise book, but added up automatically.

import { Prisma, PaymentMethod } from "@prisma/client";
import { db } from "@/config/db";
import { BadRequestError, NotFoundError } from "@/common/errors/AppError";
import { buildLineItems, paymentStatusFor, sumPayments } from "./orders.service";

type Tx = Prisma.TransactionClient;
const ZERO = new Prisma.Decimal(0);

// Tanzania is UTC+3 all year (no daylight saving). A "day" in the daily book
// runs midnight-to-midnight East Africa Time, not UTC.
const BUSINESS_UTC_OFFSET_HOURS = 3;

interface OrderItemInput {
  menuItemId: string;
  quantity: number;
  notes?: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Tanzanian numbers get written many ways: 0712 345 678, +255712345678,
// 255-712-345-678. Store one form so the same customer is found again.
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("255")) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 10) return `+255${digits.slice(1)}`;
  if (digits.length === 9) return `+255${digits}`;
  return raw.trim();
}

async function resolveCustomer(
  tx: Tx,
  tenantId: string,
  customerId?: string,
  newCustomer?: { fullName: string; phone: string }
) {
  if (customerId) {
    const customer = await tx.customer.findFirst({ where: { id: customerId, tenantId } });
    if (!customer) throw new NotFoundError("Customer not found");
    return customer;
  }
  if (newCustomer) {
    const phone = normalizePhone(newCustomer.phone);
    // Same phone = same person, even if the cashier spelled the name differently.
    const existing = await tx.customer.findFirst({
      where: { tenantId, phone: { in: [phone, newCustomer.phone.trim()] } },
    });
    if (existing) return existing;
    return tx.customer.create({
      data: { tenantId, fullName: newCustomer.fullName.trim(), phone },
    });
  }
  return null;
}

// Splits money received into: applied to the bill, change to give back.
// Change is only possible with cash — you can't give change on M-Pesa.
function splitReceived(method: PaymentMethod, received: Prisma.Decimal, due: Prisma.Decimal) {
  if (received.gt(due) && method !== "CASH") {
    throw new BadRequestError(
      `Only cash payments can be more than the amount due (${due.toFixed(2)}). Enter the exact amount for ${method.replace("_", " ").toLowerCase()}.`
    );
  }
  const applied = Prisma.Decimal.min(received, due);
  const change = method === "CASH" ? Prisma.Decimal.max(received.sub(due), ZERO) : ZERO;
  return { applied, change };
}

function businessDayRange(date?: string) {
  const offsetMs = BUSINESS_UTC_OFFSET_HOURS * 60 * 60 * 1000;
  let y: number, m: number, d: number;
  if (date) {
    [y, m, d] = date.split("-").map(Number) as [number, number, number];
  } else {
    const local = new Date(Date.now() + offsetMs);
    y = local.getUTCFullYear();
    m = local.getUTCMonth() + 1;
    d = local.getUTCDate();
  }
  const start = new Date(Date.UTC(y, m - 1, d) - offsetMs);
  if (Number.isNaN(start.getTime())) throw new BadRequestError("Invalid date");
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const label = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return { start, end, label };
}

// ---------------------------------------------------------------------------
// Counter checkout — one call does the whole sale
// ---------------------------------------------------------------------------

export async function counterCheckout(
  tenantId: string,
  cashierId: string,
  input: {
    items: OrderItemInput[];
    method: PaymentMethod;
    amountReceived: number;
    customerId?: string;
    newCustomer?: { fullName: string; phone: string };
    notes?: string;
  }
) {
  const result = await db.$transaction(async (tx) => {
    const lineItems = await buildLineItems(tx, tenantId, input.items);
    const total = lineItems.reduce((sum, l) => sum.add(l.lineTotal), ZERO);
    const received = new Prisma.Decimal(input.amountReceived);
    const { applied, change } = splitReceived(input.method, received, total);
    const balance = total.sub(applied);

    const customer = await resolveCustomer(tx, tenantId, input.customerId, input.newCustomer);
    if (balance.gt(0) && !customer) {
      throw new BadRequestError(
        `${balance.toFixed(2)} is still unpaid. Enter the customer's name and phone to record it as a debt.`
      );
    }

    const order = await tx.order.create({
      data: {
        tenantId,
        employeeId: cashierId,
        customerId: customer?.id ?? null,
        status: "COMPLETED", // counter sales are served on the spot
        paymentStatus: paymentStatusFor(applied, total),
        subtotal: total,
        discount: 0,
        total,
        notes: input.notes ?? null,
        items: { create: lineItems },
      },
    });

    if (received.gt(0)) {
      await tx.orderPayment.create({
        data: {
          tenantId,
          orderId: order.id,
          method: input.method,
          amount: applied,
          amountTendered: received,
          changeGiven: change,
        },
      });
    }

    return { orderId: order.id, total, paid: applied, change, balance };
  });

  // Read back outside the transaction: it's only for the receipt, and every
  // query inside the transaction counts against its time limit.
  const order = await db.order.findUniqueOrThrow({
    where: { id: result.orderId },
    include: {
      items: { include: { menuItem: { select: { name: true } } } },
      customer: { select: { id: true, fullName: true, phone: true } },
      payments: true,
    },
  });

  return { order, total: result.total, paid: result.paid, change: result.change, balance: result.balance };
}

// ---------------------------------------------------------------------------
// Debts (madeni)
// ---------------------------------------------------------------------------

export async function listDebtors(tenantId: string, search?: string) {
  const searchFilter = search
    ? Prisma.sql`AND (c."fullName" ILIKE ${"%" + search + "%"} OR c.phone ILIKE ${"%" + search + "%"})`
    : Prisma.empty;

  const rows = await db.$queryRaw<
    {
      customerId: string;
      fullName: string;
      phone: string | null;
      orderCount: number;
      balance: Prisma.Decimal;
      oldestDebtAt: Date;
      lastDebtAt: Date;
    }[]
  >`
    SELECT c.id AS "customerId", c."fullName", c.phone,
           COUNT(o.id)::int AS "orderCount",
           SUM(o.total - COALESCE(p.paid, 0)) AS balance,
           MIN(o."createdAt") AS "oldestDebtAt",
           MAX(o."createdAt") AS "lastDebtAt"
    FROM orders o
    JOIN customers c ON c.id = o."customerId"
    LEFT JOIN (
      SELECT "orderId", SUM(amount) AS paid
      FROM order_payments
      WHERE "tenantId" = ${tenantId}
      GROUP BY "orderId"
    ) p ON p."orderId" = o.id
    WHERE o."tenantId" = ${tenantId}
      AND o.status = 'COMPLETED'
      AND o."paymentStatus" <> 'PAID'
      ${searchFilter}
    GROUP BY c.id, c."fullName", c.phone
    HAVING SUM(o.total - COALESCE(p.paid, 0)) > 0
    ORDER BY balance DESC
  `;

  const totalOutstanding = rows.reduce((sum, r) => sum.add(r.balance), ZERO);
  return { debtors: rows, totalOutstanding, debtorCount: rows.length };
}

async function unpaidOrdersFor(tx: Tx | typeof db, tenantId: string, customerId: string) {
  const orders = await tx.order.findMany({
    where: {
      tenantId,
      customerId,
      status: "COMPLETED", // an open table order isn't a debt yet
      paymentStatus: { not: "PAID" },
    },
    orderBy: { createdAt: "asc" }, // oldest debt first
    include: {
      items: { include: { menuItem: { select: { name: true } } } },
      payments: { orderBy: { createdAt: "asc" } },
    },
  });
  return orders
    .map((o) => {
      const paid = o.payments.reduce((sum, p) => sum.add(p.amount), ZERO);
      return { ...o, paid, balance: o.total.sub(paid) };
    })
    .filter((o) => o.balance.gt(0));
}

export async function getCustomerDebt(tenantId: string, customerId: string) {
  const customer = await db.customer.findFirst({ where: { id: customerId, tenantId } });
  if (!customer) throw new NotFoundError("Customer not found");

  const orders = await unpaidOrdersFor(db, tenantId, customerId);
  const balance = orders.reduce((sum, o) => sum.add(o.balance), ZERO);

  // Recent repayments, so the cashier can answer "I paid you last week!"
  const recentPayments = await db.orderPayment.findMany({
    where: { tenantId, order: { customerId } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return { customer, balance, orders, recentPayments };
}

// A customer pays back some or all of what they owe. The money clears their
// oldest debts first, exactly like crossing off lines in the book.
export async function recordDebtPayment(
  tenantId: string,
  customerId: string,
  input: { method: PaymentMethod; amountReceived: number }
) {
  return db.$transaction(async (tx) => {
    const customer = await tx.customer.findFirst({ where: { id: customerId, tenantId } });
    if (!customer) throw new NotFoundError("Customer not found");

    const orders = await unpaidOrdersFor(tx, tenantId, customerId);
    const owed = orders.reduce((sum, o) => sum.add(o.balance), ZERO);
    if (owed.lte(0)) throw new BadRequestError(`${customer.fullName} has no unpaid debts`);

    const received = new Prisma.Decimal(input.amountReceived);
    const { applied, change } = splitReceived(input.method, received, owed);

    let remaining = applied;
    let first = true;
    const cleared: string[] = [];

    for (const order of orders) {
      if (remaining.lte(0)) break;
      const portion = Prisma.Decimal.min(remaining, order.balance);

      await tx.orderPayment.create({
        data: {
          tenantId,
          orderId: order.id,
          method: input.method,
          amount: portion,
          // Cash handed over and change are recorded once, on the first line.
          ...(first && { amountTendered: received, changeGiven: change }),
        },
      });
      first = false;

      const paidNow = (await sumPayments(tx, order.id));
      const status = paymentStatusFor(paidNow, order.total);
      await tx.order.update({ where: { id: order.id }, data: { paymentStatus: status } });
      if (status === "PAID") cleared.push(order.id);

      remaining = remaining.sub(portion);
    }

    return {
      customer: { id: customer.id, fullName: customer.fullName, phone: customer.phone },
      paid: applied,
      change,
      remainingBalance: owed.sub(applied),
      ordersCleared: cleared.length,
    };
  });
}

// ---------------------------------------------------------------------------
// Daily book (daftari la siku)
// ---------------------------------------------------------------------------

export async function getDaybook(tenantId: string, date?: string) {
  const { start, end, label } = businessDayRange(date);

  const [foods, salesTotals, paymentRows, newDebts] = await Promise.all([
    // What was sold today, and how much each dish brought in.
    db.$queryRaw<{ menuItemId: string; name: string; quantity: number; amount: Prisma.Decimal }[]>`
      SELECT oi."menuItemId", m.name,
             SUM(oi.quantity)::int AS quantity,
             SUM(oi."lineTotal") AS amount
      FROM order_items oi
      JOIN orders o ON o.id = oi."orderId"
      JOIN menu_items m ON m.id = oi."menuItemId"
      WHERE o."tenantId" = ${tenantId}
        AND o.status <> 'CANCELLED'
        AND o."createdAt" >= ${start} AND o."createdAt" < ${end}
      GROUP BY oi."menuItemId", m.name
      ORDER BY quantity DESC, m.name ASC
    `,

    db.order.aggregate({
      where: { tenantId, status: { not: "CANCELLED" }, createdAt: { gte: start, lt: end } },
      _sum: { total: true },
      _count: true,
    }),

    // Money received today, split by method and by whether it paid for
    // today's food or an older debt.
    db.$queryRaw<{ method: PaymentMethod; isDebtRepayment: boolean; amount: Prisma.Decimal; change: Prisma.Decimal }[]>`
      SELECT p.method,
             (o."createdAt" < ${start}) AS "isDebtRepayment",
             SUM(p.amount) AS amount,
             SUM(COALESCE(p."changeGiven", 0)) AS change
      FROM order_payments p
      JOIN orders o ON o.id = p."orderId"
      WHERE p."tenantId" = ${tenantId}
        AND o.status <> 'CANCELLED'
        AND p."createdAt" >= ${start} AND p."createdAt" < ${end}
      GROUP BY 1, 2 -- by position: the date parameter appears twice, so
               -- Postgres would not match the two expressions by text
    `,

    // Today's orders that were not fully paid today = new debts.
    db.$queryRaw<{ orderId: string; customerId: string | null; fullName: string | null; phone: string | null; amount: Prisma.Decimal; createdAt: Date }[]>`
      SELECT o.id AS "orderId", c.id AS "customerId", c."fullName", c.phone,
             o.total - COALESCE(SUM(p.amount) FILTER (WHERE p."createdAt" < ${end}), 0) AS amount,
             o."createdAt"
      FROM orders o
      LEFT JOIN customers c ON c.id = o."customerId"
      LEFT JOIN order_payments p ON p."orderId" = o.id
      WHERE o."tenantId" = ${tenantId}
        AND o.status = 'COMPLETED'
        AND o."createdAt" >= ${start} AND o."createdAt" < ${end}
      GROUP BY o.id, c.id, c."fullName", c.phone
      HAVING o.total - COALESCE(SUM(p.amount) FILTER (WHERE p."createdAt" < ${end}), 0) > 0
      ORDER BY o."createdAt" ASC
    `,
  ]);

  const methods: PaymentMethod[] = ["CASH", "MOBILE_MONEY", "CARD", "OTHER"];
  const byMethod = methods.map((method) => {
    const rows = paymentRows.filter((r) => r.method === method);
    const forSales = rows.filter((r) => !r.isDebtRepayment).reduce((s, r) => s.add(r.amount), ZERO);
    const forDebts = rows.filter((r) => r.isDebtRepayment).reduce((s, r) => s.add(r.amount), ZERO);
    const changeGiven = rows.reduce((s, r) => s.add(r.change), ZERO);
    return { method, forSales, forDebts, total: forSales.add(forDebts), changeGiven };
  });

  const moneyReceived = byMethod.reduce((s, m) => s.add(m.total), ZERO);
  const debtsCollected = byMethod.reduce((s, m) => s.add(m.forDebts), ZERO);
  const debtsGiven = newDebts.reduce((s, d) => s.add(d.amount), ZERO);

  return {
    date: label,
    orderCount: salesTotals._count,
    totalSales: salesTotals._sum.total ?? ZERO,
    moneyReceived,
    byMethod,
    debtsGiven,
    debtsCollected,
    newDebts,
    foods,
  };
}
