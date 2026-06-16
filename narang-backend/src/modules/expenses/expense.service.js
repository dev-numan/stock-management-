import { Prisma } from '@prisma/client';
import { db } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { runIdempotent } from '../../utils/idempotency.js';

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
  if (Number(data.amount) <= 0) {
    throw new ApiError(400, 'Amount must be greater than zero');
  }
  return runIdempotent(
    db,
    data.clientRequestId,
    (tx) =>
      tx.expense.create({
        data: {
          title: data.title,
          amount: new Prisma.Decimal(data.amount),
          category: data.category,
          date: new Date(data.date),
          notes: data.notes || null,
        },
      }),
    () => ({ duplicate: true })
  );
};

export const deleteExpense = async (id) => {
  const expense = await db.expense.findUnique({ where: { id } });
  if (!expense) return { id, alreadyDeleted: true };
  await db.expense.delete({ where: { id } });
  return { id };
};
