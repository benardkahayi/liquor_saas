import { Request, Response, NextFunction } from "express";
import {
  createCustomerSchema,
  updateCustomerSchema,
  listCustomersQuerySchema,
} from "./customers.validation";
import * as customersService from "./customers.service";

export async function createCustomerHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createCustomerSchema.parse(req.body);
    const customer = await customersService.createCustomer(req.user!.tenantId!, input);
    res.status(201).json({ data: customer });
  } catch (err) {
    next(err);
  }
}

export async function listCustomersHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listCustomersQuerySchema.parse(req.query);
    const result = await customersService.listCustomers(req.user!.tenantId!, query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getCustomerHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const customer = await customersService.getCustomerById(
      req.user!.tenantId!,
      req.params.id
    );
    res.status(200).json({ data: customer });
  } catch (err) {
    next(err);
  }
}

export async function updateCustomerHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateCustomerSchema.parse(req.body);
    const customer = await customersService.updateCustomer(
      req.user!.tenantId!,
      req.params.id,
      input
    );
    res.status(200).json({ data: customer });
  } catch (err) {
    next(err);
  }
}

export async function deleteCustomerHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await customersService.deleteCustomer(req.user!.tenantId!, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}