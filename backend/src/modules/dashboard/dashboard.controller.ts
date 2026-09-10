import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import * as dashboardService from "./dashboard.service";

const daysQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(365).default(30),
});

const topProductsQuerySchema = daysQuerySchema.extend({
  limit: z.coerce.number().int().positive().max(50).default(5),
});

export async function getSummaryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const summary = await dashboardService.getSummary(req.user!.tenantId!);
    res.status(200).json({ data: summary });
  } catch (err) {
    next(err);
  }
}

export async function getSalesOverTimeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { days } = daysQuerySchema.parse(req.query);
    const result = await dashboardService.getSalesOverTime(req.user!.tenantId!, days);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function getTopProductsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { days, limit } = topProductsQuerySchema.parse(req.query);
    const result = await dashboardService.getTopProducts(req.user!.tenantId!, limit, days);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function getSalesByPaymentMethodHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { days } = daysQuerySchema.parse(req.query);
    const result = await dashboardService.getSalesByPaymentMethod(req.user!.tenantId!, days);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}