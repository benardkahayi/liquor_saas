import { Request, Response, NextFunction } from "express";
import {
  createSupplierSchema,
  updateSupplierSchema,
  listSuppliersQuerySchema,
  recordPaymentSchema,
} from "./suppliers.validation";
import * as suppliersService from "./suppliers.service";

export async function createSupplierHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createSupplierSchema.parse(req.body);
    const supplier = await suppliersService.createSupplier(req.user!.tenantId!, input);
    res.status(201).json({ data: supplier });
  } catch (err) {
    next(err);
  }
}

export async function listSuppliersHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listSuppliersQuerySchema.parse(req.query);
    const result = await suppliersService.listSuppliers(req.user!.tenantId!, query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getSupplierHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const supplierId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const supplier = await suppliersService.getSupplierById(req.user!.tenantId!, supplierId);
    res.status(200).json({ data: supplier });
  } catch (err) {
    next(err);
  }
}

export async function updateSupplierHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateSupplierSchema.parse(req.body);
    const supplierId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const supplier = await suppliersService.updateSupplier(
      req.user!.tenantId!,
      supplierId,
      input
    );
    res.status(200).json({ data: supplier });
  } catch (err) {
    next(err);
  }
}

export async function deleteSupplierHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const supplierId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await suppliersService.deleteSupplier(req.user!.tenantId!, supplierId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function recordPaymentHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { amount } = recordPaymentSchema.parse(req.body);
    const supplierId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const supplier = await suppliersService.recordPayment(req.user!.tenantId!, supplierId, amount);
    res.status(200).json({ data: supplier });
  } catch (err) {
    next(err);
  }
}