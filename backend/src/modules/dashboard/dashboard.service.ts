import { db } from "@/config/db";

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
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

export async function getSalesOverTime(tenantId: string, days: number) {
  return db.$queryRaw<{ date: Date; total: string }[]>`
    SELECT date_trunc('day', "createdAt") as date, SUM(total) as total
    FROM sales
    WHERE "tenantId" = ${tenantId}
      AND "createdAt" >= NOW() - make_interval(days => ${days})
      AND status = 'COMPLETED'
    GROUP BY date_trunc('day', "createdAt")
    ORDER BY date ASC
  `;
}

export async function getTopProducts(tenantId: string, limit: number, days: number) {
  return db.$queryRaw<{ productId: string; name: string; totalQuantity: string }[]>`
    SELECT si."productId", p.name, SUM(si.quantity) as "totalQuantity"
    FROM sale_items si
    JOIN sales s ON s.id = si."saleId"
    JOIN products p ON p.id = si."productId"
    WHERE s."tenantId" = ${tenantId}
      AND s."createdAt" >= NOW() - make_interval(days => ${days})
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
      AND s."createdAt" >= NOW() - make_interval(days => ${days})
      AND s.status = 'COMPLETED'
    GROUP BY pay.method
  `;
}