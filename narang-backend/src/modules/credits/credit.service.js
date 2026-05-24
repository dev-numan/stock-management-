import { db } from '../../config/db.js';

export const getCreditSales = async () => {
  const sales = await db.sale.findMany({
    where: { paymentMethod: 'CREDIT' },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const totalOutstanding = sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);

  return {
    totalOutstanding,
    count: sales.length,
    sales,
  };
};
