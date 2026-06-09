import { db } from '../../config/db.js';
import { mapSaleWithCustomer } from '../parties/party.service.js';

export const getCreditSales = async () => {
  const sales = await db.sale.findMany({
    where: { paymentMethod: 'CREDIT' },
    include: {
      party: { select: { id: true, name: true, phone: true, advanceBalance: true, partyType: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const owingParties = await db.party.findMany({
    where: { advanceBalance: { lt: 0 } },
    select: { advanceBalance: true },
  });
  const totalOutstanding = owingParties.reduce(
    (sum, c) => sum + Math.abs(Number(c.advanceBalance)),
    0
  );

  return {
    totalOutstanding,
    count: sales.length,
    sales: sales.map(mapSaleWithCustomer),
  };
};
