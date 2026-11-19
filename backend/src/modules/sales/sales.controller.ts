import { Request, Response, NextFunction } from "express";
import { createSaleSchema, listSalesQuerySchema } from "./sales.validation";
import * as salesService from "./sales.service";

export async function createSaleHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createSaleSchema.parse(req.body);
    const sale = await salesService.createSale(
      req.user!.tenantId!,
      req.user!.userId,
      input
    );
    res.status(201).json({ data: sale });
  } catch (err) {
    next(err);
  }
}

export async function listSalesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listSalesQuerySchema.parse(req.query);
    const result = await salesService.listSales(req.user!.tenantId!, query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getSaleHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const saleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const sale = await salesService.getSaleById(req.user!.tenantId!, saleId);
    res.status(200).json({ data: sale });
  } catch (err) {
    next(err);
  }
}