import { Request, Response, NextFunction } from "express";
import {
  createAdjustmentSchema,
  listHistoryQuerySchema,
  stockInSchema,
  importStockSchema,
  listStockInsQuerySchema,
} from "./inventory.validation";
import * as inventoryService from "./inventory.service";

export async function createAdjustmentHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createAdjustmentSchema.parse(req.body);
    const result = await inventoryService.createAdjustment(req.user!.tenantId!, input);
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function listHistoryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listHistoryQuerySchema.parse(req.query);
    const productId = Array.isArray(req.params.productId) ? req.params.productId[0] : req.params.productId;
    const result = await inventoryService.listHistoryForProduct(req.user!.tenantId!, productId, query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function stockInHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = stockInSchema.parse(req.body);
    const result = await inventoryService.stockIn(req.user!.tenantId!, input);
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function listStockInsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listStockInsQuerySchema.parse(req.query);
    const result = await inventoryService.listStockIns(req.user!.tenantId!, query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function importStockHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = importStockSchema.parse(req.body);
    const result = await inventoryService.importStock(req.user!.tenantId!, input);
    res.status(input.dryRun || !result.applied ? 200 : 201).json({ data: result });
  } catch (err) {
    next(err);
  }
}
