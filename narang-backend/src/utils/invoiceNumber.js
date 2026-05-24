import { db } from '../config/db.js';
import { INVOICE_PREFIX } from '../constants/branding.js';

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} [client]
 */
export const generateInvoiceNumber = async (client = db) => {
  const prefix = INVOICE_PREFIX;
  const year = new Date().getFullYear();

  const lastSale = await client.sale.findFirst({
    where: {
      invoiceNumber: { startsWith: `${prefix}-${year}-` },
    },
    orderBy: { createdAt: 'desc' },
    select: { invoiceNumber: true },
  });

  let nextNum = 1;
  if (lastSale) {
    const parts = lastSale.invoiceNumber.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!Number.isNaN(lastNum)) {
      nextNum = lastNum + 1;
    }
  }

  return `${prefix}-${year}-${String(nextNum).padStart(4, '0')}`;
};
