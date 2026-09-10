import { Request, Response, NextFunction } from "express";
import {
  createProductSchema,
  updateProductSchema,
  listProductsQuerySchema,
} from "./products.validation";
import * as productsService from "./products.service";

export async function createProductHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createProductSchema.parse(req.body);
    const product = await productsService.createProduct(req.user!.tenantId!, input);
    res.status(201).json({ data: product });
  } catch (err) {
    next(err);
  }
}

export async function listProductsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listProductsQuerySchema.parse(req.query);
    const result = await productsService.listProducts(req.user!.tenantId!, query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getProductHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await productsService.getProductById(req.user!.tenantId!, req.params.id);
    res.status(200).json({ data: product });
  } catch (err) {
    next(err);
  }
}

export async function updateProductHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateProductSchema.parse(req.body);
    const product = await productsService.updateProduct(
      req.user!.tenantId!,
      req.params.id,
      input
    );
    res.status(200).json({ data: product });
  } catch (err) {
    next(err);
  }
}

export async function deleteProductHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await productsService.deleteProduct(req.user!.tenantId!, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}