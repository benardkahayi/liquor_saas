import { Request, Response, NextFunction } from "express";
import {
  counterCheckoutSchema,
  debtPaymentSchema,
  listDebtorsQuerySchema,
  daybookQuerySchema,
} from "./counter.validation";
import * as counterService from "./counter.service";

function paramId(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] : value ?? "";
}

export async function counterCheckoutHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = counterCheckoutSchema.parse(req.body);
    const result = await counterService.counterCheckout(req.user!.tenantId!, req.user!.userId, input);
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function listDebtorsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { search } = listDebtorsQuerySchema.parse(req.query);
    const result = await counterService.listDebtors(req.user!.tenantId!, search || undefined);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function getCustomerDebtHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await counterService.getCustomerDebt(req.user!.tenantId!, paramId(req.params.customerId));
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function recordDebtPaymentHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = debtPaymentSchema.parse(req.body);
    const result = await counterService.recordDebtPayment(
      req.user!.tenantId!,
      paramId(req.params.customerId),
      input
    );
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function daybookHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { date } = daybookQuerySchema.parse(req.query);
    const result = await counterService.getDaybook(req.user!.tenantId!, date);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}
