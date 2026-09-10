import { Prisma } from "@prisma/client";
import { db } from "@/config/db";
import { NotFoundError } from "@/common/errors/AppError";

interface CreateExpenseInput {
  category: string;
  amount: number;
  description?: string;
  date?: Date;
}

export async function createExpense(tenantId: string, input: CreateExpenseInput) {
  return db.expense.create({
    data: {
      tenantId,
      category: input.category,
      amount: input.amount,
      description: input.description,
      date: input.date ?? new Date(),
    },
  });
}

interface ListExpensesInput {
  page: number;
  pageSize: number;
  category?: string;
  startDate?: Date;
  endDate?: Date;
}

export async function listExpenses(tenantId: string, input: ListExpensesInput) {
  const where: Prisma.ExpenseWhereInput = {
    tenantId,
    ...(input.category && { category: input.category }),
    ...(input.startDate || input.endDate
      ? {
          date: {
            ...(input.startDate && { gte: input.startDate }),
            ...(input.endDate && { lte: input.endDate }),
          },
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    db.expense.findMany({
      where,
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      orderBy: { date: "desc" },
    }),
    db.expense.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages: Math.ceil(total / input.pageSize),
    },
  };
}

export async function getExpenseById(tenantId: string, expenseId: string) {
  const expense = await db.expense.findFirst({ where: { id: expenseId, tenantId } });

  if (!expense) {
    throw new NotFoundError("Expense not found");
  }

  return expense;
}

export async function updateExpense(
  tenantId: string,
  expenseId: string,
  input: Partial<CreateExpenseInput>
) {
  const existing = await db.expense.findFirst({ where: { id: expenseId, tenantId } });
  if (!existing) {
    throw new NotFoundError("Expense not found");
  }

  return db.expense.update({ where: { id: expenseId }, data: input });
}

export async function deleteExpense(tenantId: string, expenseId: string) {
  const existing = await db.expense.findFirst({ where: { id: expenseId, tenantId } });
  if (!existing) {
    throw new NotFoundError("Expense not found");
  }

  return db.expense.delete({ where: { id: expenseId } });
}