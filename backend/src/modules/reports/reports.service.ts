import { db } from "@/config/db";

export async function getLowStockReport(tenantId: string) {
  return db.$queryRaw
    { id: string; name: string; stockQuantity: number; minStockLevel: number }[]
  >`
    SELECT id, name, "stockQuantity", "minStockLevel"
    FROM products
    WHERE "tenantId" = ${tenantId} AND "stockQuantity" <= "minStockLevel" AND status = 'ACTIVE'
    ORDER BY "stockQuantity" ASC
  `;
}

export async function getInventoryValuation(tenantId: string) {
  const rows = await db.$queryRaw<{ costvalue: string; retailvalue: string }[]>`
    SELECT
      COALESCE(SUM("purchasePrice" * "stockQuantity"), 0) as costValue,
      COALESCE(SUM("sellingPrice" * "stockQuantity"), 0) as retailValue
    FROM products
    WHERE "tenantId" = ${tenantId} AND status = 'ACTIVE'
  `;

  const costValue = Number(rows[0]?.costvalue ?? 0);
  const retailValue = Number(rows[0]?.retailvalue ?? 0);

  return {
    costValue,
    retailValue,
    potentialProfit: retailValue - costValue,
  };
}

interface SalesReportInput {
  startDate: Date;
  endDate: Date;
}

export async function getSalesReport(tenantId: string, input: SalesReportInput) {
  const [totals, byDay] = await Promise.all([
    db.sale.aggregate({
      where: {
        tenantId,
        status: "COMPLETED",
        createdAt: { gte: input.startDate, lte: input.endDate },
      },
      _sum: { total: true, subtotal: true, discount: true },
      _count: true,
    }),

    db.$queryRaw<{ date: Date; total: string; count: string }[]>`
      SELECT date_trunc('day', "createdAt") as date, SUM(total) as total, COUNT(*) as count
      FROM sales
      WHERE "tenantId" = ${tenantId}
        AND status = 'COMPLETED'
        AND "createdAt" >= ${input.startDate}
        AND "createdAt" <= ${input.endDate}
      GROUP BY date_trunc('day', "createdAt")
      ORDER BY date ASC
    `,
  ]);

  return {
    totalRevenue: totals._sum.total ?? 0,
    totalDiscount: totals._sum.discount ?? 0,
    saleCount: totals._count,
    byDay,
  };
}

export async function getExpensesByCategory(tenantId: string, input: SalesReportInput) {
  return db.expense.groupBy({
    by: ["category"],
    where: { tenantId, date: { gte: input.startDate, lte: input.endDate } },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
  });
}