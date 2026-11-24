import { Prisma } from "@prisma/client";
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
// ---------------------------------------------------------------------------
// Shop dashboard (BizSmart layout): month totals, a 6-month chart, today's
// figures, recent sales and the value of the stock on hand. One request.
// Months and days are East Africa Time.
// ---------------------------------------------------------------------------

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const EAT_MONTH = Prisma.sql`to_char((("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Africa/Dar_es_Salaam'), 'YYYY-MM')`;

export async function getShopOverview(tenantId: string, monthsBack = 6) {
  const local = new Date(Date.now() + BUSINESS_UTC_OFFSET_MS);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const from = new Date(Date.UTC(y, m - (monthsBack - 1), 1) - BUSINESS_UTC_OFFSET_MS);
  const { start: todayStart } = getTodayRange();

  const [revenueRows, cogsRows, expenseRows, today, productCount, lowStock, stockRows, recent] = await Promise.all([
    db.$queryRaw<{ month: string; total: string }[]>`
      SELECT ${EAT_MONTH} AS month, SUM(total) AS total
      FROM sales
      WHERE "tenantId" = ${tenantId} AND status = 'COMPLETED' AND "createdAt" >= ${from}
      GROUP BY 1`,
    db.$queryRaw<{ month: string; total: string }[]>`
      SELECT to_char(((s."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Africa/Dar_es_Salaam'), 'YYYY-MM') AS month,
             SUM(p."purchasePrice" * si.quantity) AS total
      FROM sale_items si
      JOIN sales s ON s.id = si."saleId"
      JOIN products p ON p.id = si."productId"
      WHERE s."tenantId" = ${tenantId} AND s.status = 'COMPLETED' AND s."createdAt" >= ${from}
      GROUP BY 1`,
    db.$queryRaw<{ month: string; total: string }[]>`
      SELECT to_char(((date AT TIME ZONE 'UTC') AT TIME ZONE 'Africa/Dar_es_Salaam'), 'YYYY-MM') AS month,
             SUM(amount) AS total
      FROM expenses
      WHERE "tenantId" = ${tenantId} AND date >= ${from}
      GROUP BY 1`,
    getSummary(tenantId),
    db.product.count({ where: { tenantId, status: "ACTIVE" } }),
    db.$queryRaw<{ n: number }[]>`
      SELECT COUNT(*)::int AS n FROM products
      WHERE "tenantId" = ${tenantId} AND status = 'ACTIVE' AND "stockQuantity" <= "minStockLevel"`,
    db.$queryRaw<
      { id: string; name: string; stockQuantity: number; minStockLevel: number; purchasePrice: string; sellingPrice: string }[]
    >`
      SELECT id, name, "stockQuantity", "minStockLevel", "purchasePrice", "sellingPrice"
      FROM products
      WHERE "tenantId" = ${tenantId} AND status = 'ACTIVE'
      ORDER BY "purchasePrice" * GREATEST("stockQuantity", 0) DESC, name ASC
      LIMIT 50`,
    db.sale.findMany({
      where: { tenantId, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        total: true,
        createdAt: true,
        customer: { select: { fullName: true } },
        payments: { select: { method: true } },
        _count: { select: { items: true } },
      },
    }),
  ]);

  const byMonth = (rows: { month: string; total: string }[]) => new Map(rows.map((r) => [r.month, Number(r.total)]));
  const rev = byMonth(revenueRows);
  const cogs = byMonth(cogsRows);
  const exp = byMonth(expenseRows);

  const months = Array.from({ length: monthsBack }, (_, i) => {
    const d = new Date(Date.UTC(y, m - (monthsBack - 1) + i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const revenue = rev.get(key) ?? 0;
    const costOfGoods = cogs.get(key) ?? 0;
    const expenses = exp.get(key) ?? 0;
    return {
      month: key,
      label: MONTH_NAMES[d.getUTCMonth()],
      revenue,
      costOfGoods,
      expenses,
      profit: revenue - costOfGoods - expenses,
    };
  });
  const thisMonth = months[months.length - 1];

  const stock = stockRows.map((p) => {
    const cost = Number(p.purchasePrice);
    const qty = Math.max(0, p.stockQuantity);
    return {
      id: p.id,
      name: p.name,
      stockQuantity: p.stockQuantity,
      minStockLevel: p.minStockLevel,
      purchasePrice: cost,
      sellingPrice: Number(p.sellingPrice),
      stockValue: cost * qty,
      low: p.stockQuantity <= p.minStockLevel,
    };
  });
  const valuation = await db.$queryRaw<{ cost: string; retail: string }[]>`
    SELECT COALESCE(SUM("purchasePrice" * GREATEST("stockQuantity", 0)), 0) AS cost,
           COALESCE(SUM("sellingPrice" * GREATEST("stockQuantity", 0)), 0) AS retail
    FROM products WHERE "tenantId" = ${tenantId} AND status = 'ACTIVE'`;

  return {
    thisMonth,
    months,
    today: {
      sales: Number(today.todaySales),
      salesCount: today.todaySalesCount,
      profit: today.todayProfit,
      expenses: Number(today.todayExpenses),
      since: todayStart,
    },
    products: { count: productCount, lowStock: lowStock[0]?.n ?? 0 },
    stock: {
      costValue: Number(valuation[0]?.cost ?? 0),
      retailValue: Number(valuation[0]?.retail ?? 0),
      items: stock,
      shown: stock.length,
      total: productCount,
    },
    recentSales: recent.map((s) => ({
      id: s.id,
      customer: s.customer?.fullName ?? null,
      total: Number(s.total),
      createdAt: s.createdAt,
      itemCount: s._count.items,
      methods: [...new Set(s.payments.map((p) => p.method))],
    })),
  };
}
