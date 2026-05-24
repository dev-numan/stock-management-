import { Prisma } from '@prisma/client';
import { db } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';

export const getAllExpenses = async ({ month, year }) => {
  const where = {};

  if (month && year) {
    const start = new Date(Number(year), Number(month) - 1, 1);
    const end = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
    where.date = { gte: start, lte: end };
  } else if (year) {
    const start = new Date(Number(year), 0, 1);
    const end = new Date(Number(year), 11, 31, 23, 59, 59, 999);
    where.date = { gte: start, lte: end };
  }

  return db.expense.findMany({
    where,
    orderBy: { date: 'desc' },
  });
};

export const createExpense = async (data) => {
  return db.expense.create({
    data: {
      title: data.title,
      amount: new Prisma.Decimal(data.amount),
      category: data.category,
      date: new Date(data.date),
      notes: data.notes || null,
    },
  });
};

export const deleteExpense = async (id) => {
  const expense = await db.expense.findUnique({ where: { id } });
  if (!expense) throw new ApiError(404, 'Expense not found');
  await db.expense.delete({ where: { id } });
  return { id };
};
