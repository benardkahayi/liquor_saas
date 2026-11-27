import PDFDocument from "pdfkit";
import { db } from "@/config/db";

// All periods are calendar weeks (Monday–Sunday) or calendar months in
// East Africa Time (UTC+3, no daylight saving).
const EAT_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type Period = "week" | "month";
export type Lang = "sw" | "en";

const T = {
  sw: {
    weekly: "Ripoti ya Mauzo ya Wiki",
    monthly: "Ripoti ya Mauzo ya Mwezi",
    period: "Kipindi",
    generated: "Imetolewa",
    revenue: "Mauzo (jumla)",
    sales: "Idadi ya mauzo",
    avg: "Wastani kwa mauzo",
    discount: "Punguzo",
    cogs: "Gharama ya bidhaa",
    gross: "Faida ghafi",
    expenses: "Matumizi",
    net: "Faida halisi",
    daily: "Mauzo kwa siku",
    date: "Tarehe",
    count: "Mauzo",
    amount: "Kiasi",
    top: "Bidhaa zilizouzwa zaidi",
    product: "Bidhaa",
    qty: "Idadi",
    payments: "Njia za malipo",
    method: "Njia",
    expByCat: "Matumizi kwa aina",
    category: "Aina",
    none: "Hakuna taarifa katika kipindi hiki.",
    total: "Jumla",
    page: "Ukurasa",
    note: "Gharama ya bidhaa imekokotolewa kwa bei ya kununua iliyopo sasa.",
    methods: { CASH: "Taslimu", CARD: "Kadi", MOBILE_MONEY: "Pesa ya simu", OTHER: "Nyingine" },
    days: ["Jumapili", "Jumatatu", "Jumanne", "Jumatano", "Alhamisi", "Ijumaa", "Jumamosi"],
  },
  en: {
    weekly: "Weekly Sales Report",
    monthly: "Monthly Sales Report",
    period: "Period",
    generated: "Generated",
    revenue: "Revenue",
    sales: "Number of sales",
    avg: "Average sale",
    discount: "Discounts",
    cogs: "Cost of goods",
    gross: "Gross profit",
    expenses: "Expenses",
    net: "Net profit",
    daily: "Sales by day",
    date: "Date",
    count: "Sales",
    amount: "Amount",
    top: "Top products",
    product: "Product",
    qty: "Qty",
    payments: "Payment methods",
    method: "Method",
    expByCat: "Expenses by category",
    category: "Category",
    none: "No data for this period.",
    total: "Total",
    page: "Page",
    note: "Cost of goods uses each product's current purchase price.",
    methods: { CASH: "Cash", CARD: "Card", MOBILE_MONEY: "Mobile money", OTHER: "Other" },
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  },
} as const;

// Returns UTC instants for the start (inclusive) and end (exclusive) of the
// EAT week/month that contains `day` (a YYYY-MM-DD string, EAT calendar day).
export function periodRange(period: Period, day?: string) {
  let y: number, m: number, d: number;
  if (day && /^\d{4}-\d{2}-\d{2}$/.test(day)) {
    [y, m, d] = day.split("-").map(Number);
    m -= 1;
  } else {
    const local = new Date(Date.now() + EAT_MS);
    y = local.getUTCFullYear();
    m = local.getUTCMonth();
    d = local.getUTCDate();
  }

  let startLocal: number, endLocal: number;
  if (period === "week") {
    const base = Date.UTC(y, m, d);
    const dow = new Date(base).getUTCDay(); // 0 = Sunday
    const sinceMonday = (dow + 6) % 7;
    startLocal = base - sinceMonday * DAY_MS;
    endLocal = startLocal + 7 * DAY_MS;
  } else {
    startLocal = Date.UTC(y, m, 1);
    endLocal = Date.UTC(y, m + 1, 1);
  }
  return {
    start: new Date(startLocal - EAT_MS),
    end: new Date(endLocal - EAT_MS),
    startLocal,
    endLocal,
  };
}

async function loadData(tenantId: string, start: Date, end: Date) {
  const saleWhere = { tenantId, status: "COMPLETED" as const, createdAt: { gte: start, lt: end } };

  const [tenant, totals, byDay, cogsRows, top, payments, expenses] = await Promise.all([
    db.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, settings: { select: { phone: true, address: true, currency: true } } },
    }),
    db.sale.aggregate({ where: saleWhere, _sum: { total: true, discount: true }, _count: true }),
    db.$queryRaw<{ day: string; total: string; count: number }[]>`
      SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Africa/Dar_es_Salaam', 'YYYY-MM-DD') AS day,
             SUM(total) AS total, COUNT(*)::int AS count
      FROM sales
      WHERE "tenantId" = ${tenantId} AND status = 'COMPLETED'
        AND "createdAt" >= ${start} AND "createdAt" < ${end}
      GROUP BY 1 ORDER BY 1`,
    db.$queryRaw<{ cogs: string }[]>`
      SELECT COALESCE(SUM(p."purchasePrice" * si.quantity), 0) AS cogs
      FROM sale_items si
      JOIN sales s ON s.id = si."saleId"
      JOIN products p ON p.id = si."productId"
      WHERE s."tenantId" = ${tenantId} AND s.status = 'COMPLETED'
        AND s."createdAt" >= ${start} AND s."createdAt" < ${end}`,
    db.$queryRaw<{ name: string; qty: number; revenue: string }[]>`
      SELECT p.name, SUM(si.quantity)::int AS qty, SUM(si."lineTotal") AS revenue
      FROM sale_items si
      JOIN sales s ON s.id = si."saleId"
      JOIN products p ON p.id = si."productId"
      WHERE s."tenantId" = ${tenantId} AND s.status = 'COMPLETED'
        AND s."createdAt" >= ${start} AND s."createdAt" < ${end}
      GROUP BY p.id, p.name
      ORDER BY SUM(si."lineTotal") DESC
      LIMIT 10`,
    db.$queryRaw<{ method: string; amount: string }[]>`
      SELECT pm.method::text AS method, SUM(pm.amount) AS amount
      FROM payments pm
      JOIN sales s ON s.id = pm."saleId"
      WHERE s."tenantId" = ${tenantId} AND s.status = 'COMPLETED'
        AND s."createdAt" >= ${start} AND s."createdAt" < ${end}
      GROUP BY 1 ORDER BY 2 DESC`,
    db.expense.groupBy({
      by: ["category"],
      where: { tenantId, date: { gte: start, lt: end } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
    }),
  ]);

  return { tenant, totals, byDay, cogsRows, top, payments, expenses };
}

export async function buildSalesPdf(
  tenantId: string,
  opts: { period: Period; date?: string; lang: Lang }
): Promise<{ buffer: Buffer; filename: string }> {
  const t = T[opts.lang];
  const range = periodRange(opts.period, opts.date);
  const data = await loadData(tenantId, range.start, range.end);

  // Same label the app uses everywhere (frontend lib/money.ts).
  const currency = "Tsh";
  const money = (v: number) =>
    `${currency} ${v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  const fmtDay = (ms: number, withName = false) => {
    const dt = new Date(ms);
    const s = `${String(dt.getUTCDate()).padStart(2, "0")}/${String(dt.getUTCMonth() + 1).padStart(2, "0")}/${dt.getUTCFullYear()}`;
    return withName ? `${t.days[dt.getUTCDay()]} ${s}` : s;
  };

  const revenue = Number(data.totals._sum.total ?? 0);
  const discount = Number(data.totals._sum.discount ?? 0);
  const count = data.totals._count;
  const cogs = Number(data.cogsRows[0]?.cogs ?? 0);
  const expenseTotal = data.expenses.reduce((s, e) => s + Number(e._sum.amount ?? 0), 0);
  const gross = revenue - cogs;
  const net = gross - expenseTotal;

  const doc = new PDFDocument({ size: "A4", margin: 48, bufferPages: true, info: { Title: opts.period === "week" ? t.weekly : t.monthly } });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<void>((resolve) => doc.on("end", () => resolve()));

  const left = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const ink = "#1f2937";
  const muted = "#6b7280";
  const accent = "#b45309";
  const rule = "#e5e7eb";

  // Header
  doc.fillColor(ink).font("Helvetica-Bold").fontSize(18).text(data.tenant?.name ?? "", left, 48, { width });
  const contact = [data.tenant?.settings?.phone, data.tenant?.settings?.address].filter(Boolean).join("   ");
  if (contact) doc.font("Helvetica").fontSize(9).fillColor(muted).text(contact, { width });
  doc.moveDown(0.6);
  doc.font("Helvetica-Bold").fontSize(14).fillColor(accent).text(opts.period === "week" ? t.weekly : t.monthly, { width });
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(ink)
    .text(`${t.period}: ${fmtDay(range.startLocal)} - ${fmtDay(range.endLocal - DAY_MS)}`, { width });
  const nowLocal = new Date(Date.now() + EAT_MS);
  doc
    .fontSize(8)
    .fillColor(muted)
    .text(
      `${t.generated}: ${fmtDay(nowLocal.getTime())} ${String(nowLocal.getUTCHours()).padStart(2, "0")}:${String(nowLocal.getUTCMinutes()).padStart(2, "0")} (EAT)`,
      { width }
    );
  doc.moveDown(0.8);

  // Summary grid: 4 columns x 2 rows
  const cells: [string, string, string?][] = [
    [t.revenue, money(revenue)],
    [t.sales, String(count)],
    [t.avg, money(count ? revenue / count : 0)],
    [t.discount, money(discount)],
    [t.cogs, money(cogs)],
    [t.gross, money(gross), gross < 0 ? "#b91c1c" : "#047857"],
    [t.expenses, money(expenseTotal)],
    [t.net, money(net), net < 0 ? "#b91c1c" : "#047857"],
  ];
  const cellW = width / 4;
  const cellH = 46;
  let y = doc.y;
  cells.forEach(([label, value, color], i) => {
    const cx = left + (i % 4) * cellW;
    const cy = y + Math.floor(i / 4) * (cellH + 6);
    doc.roundedRect(cx + 2, cy, cellW - 4, cellH, 4).fillAndStroke("#fafaf9", rule);
    doc.fillColor(muted).font("Helvetica").fontSize(8).text(label, cx + 10, cy + 8, { width: cellW - 20 });
    doc.fillColor(color ?? ink).font("Helvetica-Bold").fontSize(11).text(value, cx + 10, cy + 22, { width: cellW - 20 });
  });
  doc.x = left;
  doc.y = y + 2 * (cellH + 6) + 10;

  // Simple table helper with page breaks and repeated header.
  function table(title: string, cols: { label: string; w: number; align?: "left" | "right" }[], rows: string[][], totalRow?: string[]) {
    const bottom = doc.page.height - doc.page.margins.bottom - 20;
    if (doc.y + 60 > bottom) doc.addPage();
    doc.moveDown(1.2);
    doc.fillColor(ink).font("Helvetica-Bold").fontSize(11).text(title, left, doc.y, { width });
    doc.moveDown(0.3);

    const drawRow = (cells: string[], opts: { bold?: boolean; header?: boolean }) => {
      const rowH = 18;
      if (doc.y + rowH > bottom) {
        doc.addPage();
        drawRow(cols.map((c) => c.label), { header: true });
      }
      const ry = doc.y;
      if (opts.header) doc.rect(left, ry, width, rowH).fill("#f3f4f6");
      let x = left;
      cells.forEach((cell, i) => {
        const col = cols[i];
        const w = col.w * width;
        doc
          .fillColor(opts.header ? muted : ink)
          .font(opts.bold || opts.header ? "Helvetica-Bold" : "Helvetica")
          .fontSize(opts.header ? 8 : 9)
          .text(cell, x + 6, ry + 5, { width: w - 12, align: col.align ?? "left", lineBreak: false, ellipsis: true });
        x += w;
      });
      doc.moveTo(left, ry + rowH).lineTo(left + width, ry + rowH).lineWidth(0.5).strokeColor(rule).stroke();
      doc.x = left;
      doc.y = ry + rowH;
    };

    drawRow(cols.map((c) => c.label), { header: true });
    if (rows.length === 0) {
      doc.fillColor(muted).font("Helvetica-Oblique").fontSize(9).text(t.none, left + 6, doc.y + 5, { width });
      doc.x = left;
      doc.moveDown(0.5);
      return;
    }
    rows.forEach((r) => drawRow(r, {}));
    if (totalRow) drawRow(totalRow, { bold: true });
  }

  // Daily breakdown: every day of the period, including days with no sales.
  const dayMap = new Map(data.byDay.map((r) => [r.day, r]));
  const dayRows: string[][] = [];
  for (let ms = range.startLocal; ms < range.endLocal; ms += DAY_MS) {
    const key = new Date(ms).toISOString().slice(0, 10);
    const r = dayMap.get(key);
    dayRows.push([fmtDay(ms, true), String(r?.count ?? 0), money(Number(r?.total ?? 0))]);
  }
  table(
    t.daily,
    [
      { label: t.date, w: 0.5 },
      { label: t.count, w: 0.2, align: "right" },
      { label: t.amount, w: 0.3, align: "right" },
    ],
    dayRows,
    [t.total, String(count), money(revenue)]
  );

  table(
    t.top,
    [
      { label: t.product, w: 0.55 },
      { label: t.qty, w: 0.15, align: "right" },
      { label: t.amount, w: 0.3, align: "right" },
    ],
    data.top.map((r) => [r.name, String(r.qty), money(Number(r.revenue))])
  );

  table(
    t.payments,
    [
      { label: t.method, w: 0.7 },
      { label: t.amount, w: 0.3, align: "right" },
    ],
    data.payments.map((r) => [t.methods[r.method as keyof typeof t.methods] ?? r.method, money(Number(r.amount))])
  );

  table(
    t.expByCat,
    [
      { label: t.category, w: 0.7 },
      { label: t.amount, w: 0.3, align: "right" },
    ],
    data.expenses.map((e) => [e.category, money(Number(e._sum.amount ?? 0))]),
    data.expenses.length ? [t.total, money(expenseTotal)] : undefined
  );

  doc.moveDown(1);
  doc.fillColor(muted).font("Helvetica-Oblique").fontSize(8).text(t.note, left, doc.y, { width });

  // Footer with page numbers.
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(pages.start + i);
    const fy = doc.page.height - doc.page.margins.bottom + 16;
    const savedBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0; // writing in the margin must not add a page
    doc
      .fillColor(muted)
      .font("Helvetica")
      .fontSize(8)
      .text(`${data.tenant?.name ?? ""}  |  ${t.page} ${i + 1}/${pages.count}`, left, fy, {
        width,
        align: "center",
        lineBreak: false,
      });
    doc.page.margins.bottom = savedBottom;
  }

  doc.end();
  await done;

  const startIso = new Date(range.startLocal).toISOString().slice(0, 10);
  const tag = opts.period === "week" ? "week" : "month";
  return { buffer: Buffer.concat(chunks), filename: `sales-${tag}-${startIso}.pdf` };
}
