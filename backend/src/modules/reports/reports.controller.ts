import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import * as reportsService from "./reports.service";

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