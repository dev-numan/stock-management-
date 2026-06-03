import { Prisma } from '@prisma/client';
import { db, TRANSACTION_OPTS } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';

export const getAllCustomers = async ({ search }) => {
  return db.customer.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined,
    orderBy: { name: 'asc' },
  });
};

export const getCustomerById = async (id) => {
  const customer = await db.customer.findUnique({ where: { id } });
  if (!customer) throw new ApiError(404, 'Customer not found');
  return customer;
};

export const createCustomer = async (data) => {
  return db.customer.create({ data });
};

export const updateCustomer = async (id, data) => {
  await getCustomerById(id);
  return db.customer.update({ where: { id }, data });
};

export const deleteCustomer = async (id) => {
  await getCustomerById(id);
  await db.customer.delete({ where: { id } });
  return { id };
};

export const getCustomerAdvanceEntries = async (customerId) => {
  await getCustomerById(customerId);
  return db.customerAdvanceEntry.findMany({
    where: { customerId },
    include: {
      sale: { select: { id: true, invoiceNumber: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const deleteCustomerAdvanceEntry = async (customerId, entryId) => {
  return db.$transaction(async (tx) => {
    const entry = await tx.customerAdvanceEntry.findFirst({
      where: { id: entryId, customerId },
    });
    if (!entry) throw new ApiError(404, 'Payment entry not found');
    if (entry.saleId) {
      throw new ApiError(
        400,
        'This payment is linked to a sale. Delete the sale from Sales History first.'
      );
    }

    await tx.customerAdvanceEntry.delete({ where: { id: entryId } });
    return tx.customer.update({
      where: { id: customerId },
      data: { advanceBalance: { decrement: entry.amount } },
    });
  }, TRANSACTION_OPTS);
};

export const addCustomerAdvance = async (customerId, { amount, notes }) => {
  const value = new Prisma.Decimal(amount);
  if (value.lte(0)) {
    throw new ApiError(400, 'Amount must be greater than zero');
  }

  return db.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new ApiError(404, 'Customer not found');

    await tx.customerAdvanceEntry.create({
      data: {
        customerId,
        amount: value,
        notes: notes?.trim() || null,
      },
    });

    return tx.customer.update({
      where: { id: customerId },
      data: { advanceBalance: { increment: value } },
    });
  }, TRANSACTION_OPTS);
};
