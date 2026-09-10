import { Request, Response, NextFunction } from "express";
import {
  createExpenseSchema,
  updateExpenseSchema,
  listExpensesQuerySchema,
} from "./expenses.validation";
import * as expensesService from "./expenses.service";

export async function createExpenseHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createExpenseSchema.parse(req.body);
    const expense = await expensesService.createExpense(req.user!.tenantId!, input);
    res.status(201).json({ data: expense });
  } catch (err) {
    next(err);
  }
}

export async function listExpensesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listExpensesQuerySchema.parse(req.query);
    const result = await expensesService.listExpenses(req.user!.tenantId!, query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getExpenseHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const expense = await expensesService.getExpenseById(req.user!.tenantId!, req.params.id);
    res.status(200).json({ data: expense });
  } catch (err) {
    next(err);
  }
}

export async function updateExpenseHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateExpenseSchema.parse(req.body);
    const expense = await expensesService.updateExpense(
      req.user!.tenantId!,
      req.params.id,
      input
    );
    res.status(200).json({ data: expense });
  } catch (err) {
    next(err);
  }
}

export async function deleteExpenseHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await expensesService.deleteExpense(req.user!.tenantId!, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}