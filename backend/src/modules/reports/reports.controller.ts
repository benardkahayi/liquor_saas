import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import * as reportsService from "./reports.service";
import { buildSalesPdf } from "./reports.pdf";

function defaultMonthRange() {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { startDate, endDate };
}

const dateRangeQuerySchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export async function getLowStockReportHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await reportsService.getLowStockReport(req.user!.tenantId!);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function getInventoryValuationHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await reportsService.getInventoryValuation(req.user!.tenantId!);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function getSalesReportHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = dateRangeQuerySchema.parse(req.query);
    const defaults = defaultMonthRange();
    const result = await reportsService.getSalesReport(req.user!.tenantId!, {
      startDate: query.startDate ?? defaults.startDate,
      endDate: query.endDate ?? defaults.endDate,
    });
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function getExpensesByCategoryHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const query = dateRangeQuerySchema.parse(req.query);
    const defaults = defaultMonthRange();
    const result = await reportsService.getExpensesByCategory(req.user!.tenantId!, {
      startDate: query.startDate ?? defaults.startDate,
      endDate: query.endDate ?? defaults.endDate,
    });
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

const salesPdfQuerySchema = z.object({
  period: z.enum(["week", "month"]).default("week"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD")
    .optional(),
  lang: z.enum(["sw", "en"]).default("sw"),
});

export async function getSalesPdfHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = salesPdfQuerySchema.parse(req.query);
    const { buffer, filename } = await buildSalesPdf(req.user!.tenantId!, query);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(buffer);
  } catch (err) {
    next(err);
  }
}
