import { db } from "@/config/db";

// "Today" in East Africa Time (UTC+3, no daylight saving), regardless of
// the server's own clock/timezone — a server in UTC would otherwise start
// the day at 03:00 Dar es Salaam time.
const BUSINESS_UTC_OFFSET_MS = 3 * 60 * 60 * 1000;
function getTodayRange() {
  const local = new Date(Date.now() + BUSINESS_UTC_OFFSET_MS);
  const start = new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - BUSINESS_UTC_OFFSET_MS
  );
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { start, end };
}

export async function getSummary(tenantId: string) {
  const { start, end } = getTodayRange();

  const [salesAgg, profitRows, totalProducts, lowStockRows, totalCustomers, expensesAgg] =
    await Promise.all([
      db.sale.aggregate({
        where: { tenantId, createdAt: { gte: start, lte: end }, status: "COMPLETED" },
        _sum: { total: true },
        _count: true,
      }),

      db.$queryRaw<{ profit: string }[]>`
        SELECT COALESCE(SUM((si."unitPrice" - p."purchasePrice") * si.quantity), 0) as profit
        FROM sale_items si
        JOIN sales s ON s.id = si."saleId"
        JOIN products p ON p.id = si."productId"
        WHERE s."tenantId" = ${tenantId}
          AND s."createdAt" >= ${start}
          AND s."createdAt" <= ${end}
          AND s.status = 'COMPLETED'
      `,

      db.product.count({ where: { tenantId, status: "ACTIVE" } }),

      db.$queryRaw<{ id: string }[]>`
        SELECT id FROM products
        WHERE "tenantId" = ${tenantId} AND "stockQuantity" <= "minStockLevel" AND status = 'ACTIVE'
      `,

      db.customer.count({ where: { tenantId } }),

      db.expense.aggregate({
        where: { tenantId, date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
    ]);

  return {
    todaySales: salesAgg._sum.total ?? 0,
    todaySalesCount: salesAgg._count,
    todayProfit: Number(profitRows[0]?.profit ?? 0),
    totalProducts,
    lowStockCount: lowStockRows.length,
    totalCustomers,
    todayExpenses: expensesAgg._sum.amount ?? 0,
  };
}

export async function getRestaurantSummary(tenantId: string) {
  const { start, end } = getTodayRange();

  const [
    todaySales,
    paymentsReceived,
    outstanding,
    todayExpenses,
    todayOrders,
    customersServed,
    recentOrders,
    tables,
  ] = await Promise.all([
      db.order.aggregate({
        where: { tenantId, createdAt: { gte: start, lte: end }, status: { not: "CANCELLED" } },
        _sum: { total: true },
        _count: true,
      }),
      db.orderPayment.aggregate({
        where: { tenantId, createdAt: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      db.$queryRaw<{ outstanding: string }[]>`
        SELECT COALESCE(SUM(o.total - COALESCE(payments.total_paid, 0)), 0) AS outstanding
        FROM orders o
        LEFT JOIN (
          SELECT "orderId", SUM(amount) AS total_paid
          FROM order_payments
          WHERE "tenantId" = ${tenantId}
          GROUP BY "orderId"
        ) payments ON payments."orderId" = o.id
        WHERE o."tenantId" = ${tenantId}
          -- Real debts only, same as the Debts page: a finished order,
          -- not fully paid, with a named customer. An open table order
          -- that hasn't been paid yet is not a debt.
          AND o.status = 'COMPLETED'
          AND o."paymentStatus" <> 'PAID'
          AND o."customerId" IS NOT NULL
      `,
      db.expense.aggregate({
        where: { tenantId, date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      db.order.count({
        where: { tenantId, createdAt: { gte: start, lte: end }, status: { not: "CANCELLED" } },
      }),
      db.order.groupBy({
        by: ["customerId"],
        _count: { customerId: true },
        where: { tenantId, createdAt: { gte: start, lte: end }, customerId: { not: null } },
      }),
      db.order.findMany({
        where: { tenantId, status: { not: "CANCELLED" } },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          customer: { select: { fullName: true } },
          items: { include: { menuItem: { select: { name: true } } } },
          payments: { select: { amount: true } },
        },
      }),
      db.restaurantTable.groupBy({
        by: ["status"],
        _count: { status: true },
        where: { tenantId },
      }),
    ]);

  const salesByDay = await db.$queryRaw<{ date: Date; total: string }[]>`
    SELECT date_trunc('day', "createdAt") as date, SUM(total) as total
    FROM orders
    WHERE "tenantId" = ${tenantId}
      AND "createdAt" >= NOW() - make_interval(days => 30)
      AND status != 'CANCELLED'
    GROUP BY date_trunc('day', "createdAt")
    ORDER BY date ASC
  `;

  const available = tables.find((row: { status: string; _count: { status: number } }) => row.status === "AVAILABLE")?._count.status ?? 0;
  const occupied = tables.find((row: { status: string; _count: { status: number } }) => row.status === "OCCUPIED")?._count.status ?? 0;

  return {
    todaySales: todaySales._sum.total ?? 0,
    paymentsReceived: paymentsReceived._sum.amount ?? 0,
    outstandingDebts: Number(outstanding[0]?.outstanding ?? 0),
    todayExpenses: todayExpenses._sum.amount ?? 0,
    ordersToday: todayOrders,
    customersServedToday: customersServed.length,
    recentOrders: recentOrders.map((order: any) => ({
      id: order.id,
      customer: order.customer?.fullName ?? "Walk-in",
      items: order.items.map((item: any) => item.menuItem.name).join(", ") || "No items",
      total: Number(order.total),
      // Sum of actual payments (this used to add up the item prices, so
      // every order looked fully paid).
      paid: order.payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0),
      status: order.paymentStatus,
      createdAt: order.createdAt,
    })),
    tables: {
      total: available + occupied,
      available,
      occupied,
    },
    salesOverTime: salesByDay.map((entry: any) => ({
      date: new Date(entry.date).toISOString().slice(0, 10),
      total: Number(entry.total),
    })),
  };
}

export async function getSalesOverTime(tenantId: string, days: number) {
  return db.$queryRaw<{ date: Date; total: string }[]>`
    SELECT date_trunc('day', "createdAt") as date, SUM(total) as total
    FROM sales
    WHERE "tenantId" = ${tenantId}
      AND "createdAt" >= NOW() - make_interval(days => ${days}::int)
      AND status = 'COMPLETED'
    GROUP BY date_trunc('day', "createdAt")
    ORDER BY date ASC
  `;
}

export async function getTopProducts(tenantId: string, limit: number, days: number) {
  return db.$queryRaw<{ productId: string; name: string; totalQuantity: number }[]>`
    SELECT si."productId", p.name, SUM(si.quantity)::int as "totalQuantity"
    FROM sale_items si
    JOIN sales s ON s.id = si."saleId"
    JOIN products p ON p.id = si."productId"
    WHERE s."tenantId" = ${tenantId}
      AND s."createdAt" >= NOW() - make_interval(days => ${days}::int)
      AND s.status = 'COMPLETED'
    GROUP BY si."productId", p.name
    ORDER BY "totalQuantity" DESC
    LIMIT ${limit}
  `;
}

export async function getSalesByPaymentMethod(tenantId: string, days: number) {
  return db.$queryRaw<{ method: string; total: string }[]>`
    SELECT pay.method, SUM(pay.amount) as total
    FROM payments pay
    JOIN sales s ON s.id = pay."saleId"
    WHERE s."tenantId" = ${tenantId}
      AND s."createdAt" >= NOW() - make_interval(days => ${days}::int)
      AND s.status = 'COMPLETED'
    GROUP BY pay.method
  `;
}