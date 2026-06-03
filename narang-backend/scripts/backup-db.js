/**
 * Full read-only JSON snapshot of every table. Safety net before a destructive
 * reset. Writes to data/backup-<stamp>.json (stamp passed in or 'manual').
 *
 *   node scripts/backup-db.js [stamp]
 */
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PrismaClient } from '@prisma/client';

const __dirname = dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();
const stamp = process.argv[2] || 'manual';

async function main() {
  const dump = {
    takenAt: new Date().toISOString(),
    users: await prisma.user.findMany(),
    settings: await prisma.settings.findMany(),
    suppliers: await prisma.supplier.findMany(),
    supplierPayments: await prisma.supplierPayment.findMany(),
    customers: await prisma.customer.findMany(),
    customerAdvanceEntries: await prisma.customerAdvanceEntry.findMany(),
    products: await prisma.product.findMany(),
    sales: await prisma.sale.findMany(),
    saleItems: await prisma.saleItem.findMany(),
    purchases: await prisma.purchase.findMany(),
    purchaseItems: await prisma.purchaseItem.findMany(),
    expenses: await prisma.expense.findMany(),
  };

  const dir = join(__dirname, '../data/backups');
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `backup-${stamp}.json`);
  writeFileSync(file, JSON.stringify(dump, null, 2));

  const counts = Object.fromEntries(
    Object.entries(dump)
      .filter(([, v]) => Array.isArray(v))
      .map(([k, v]) => [k, v.length])
  );
  console.log('Backup written:', file);
  console.log(JSON.stringify(counts, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
