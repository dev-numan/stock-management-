import { db } from '../../config/db.js';

export const getCreditSales = async () => {
  const sales = await db.sale.findMany({
    where: { paymentMethod: 'CREDIT' },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  /** Net amount customers owe (negative advanceBalance), not sum of all credit sales. */
  const owingCustomers = await db.customer.findMany({
    where: { advanceBalance: { lt: 0 } },
    select: { advanceBalance: true },
  });
  const totalOutstanding = owingCustomers.reduce(
    (sum, c) => sum + Math.abs(Number(c.advanceBalance)),
    0
  );

  return {
    totalOutstanding,
    count: sales.length,
    sales,
  };
};
