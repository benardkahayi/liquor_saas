import { Request, Response, NextFunction } from "express";
import { createAdjustmentSchema, listHistoryQuerySchema } from "./inventory.validation";
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
    const result = await inventoryService.listHistoryForProduct(
      req.user!.tenantId!,
      req.params.productId,
      query
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}