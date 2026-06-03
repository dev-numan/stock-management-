/**
 * Wipe all business data (keep User + Settings) and seed the UPDATED Digi Khata
 * opening balances (reports dated 02 Jun 2026).
 *
 *   node scripts/reset-and-seed-digi-khata-v2.js --dry-run
 *   node scripts/reset-and-seed-digi-khata-v2.js
 *
 * Source: data/digi-khata-v2.json — { customers: [...], suppliers: [...] }, a
 * position-validated parse of the new PDFs (column totals reconcile exactly).
 * Customer advanceBalance: receivable -> negative, payable -> positive.
 * Supplier payable -> opening Purchase; supplier advance -> SupplierPayment.
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PrismaClient, Prisma } from '@prisma/client';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dryRun = process.argv.includes('--dry-run');
const prisma = new PrismaClient();

const NOTE = 'Opening balance from Digi Khata (03 Jun 2026)';
const inputPath = join(__dirname, '../data/digi-khata-v2.json');

function normalizePhone(phone) {
  if (!phone) return null;
  let d = String(phone).replace(/\D/g, '');
  if (d.startsWith('92')) d = `0${d.slice(2)}`;
  else if (!d.startsWith('0')) d = `0${d}`;
  return d.length >= 10 ? d.slice(0, 11) : null;
}

const dec = (n) => new Prisma.Decimal(n);

async function wipe() {
  await prisma.customerAdvanceEntry.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.purchaseItem.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.supplierPayment.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.expense.deleteMany();
}

async function main() {
  const { customers, suppliers } = JSON.parse(readFileSync(inputPath, 'utf8'));

  const supPayableSum = suppliers
    .filter((s) => s.kind === 'payable')
    .reduce((a, s) => a + s.amount, 0);
  const supAdvanceSum = suppliers
    .filter((s) => s.kind === 'advance')
    .reduce((a, s) => a + s.amount, 0);
  const recSum = customers.reduce((a, c) => a + (c.receivable || 0), 0);
  const paySum = customers.reduce((a, c) => a + (c.payable || 0), 0);

  console.log(dryRun ? '[DRY RUN] no writes' : 'LIVE RUN — wiping + seeding');
  console.log(`  Suppliers: ${suppliers.length} | payable Rs ${supPayableSum.toLocaleString('en-PK')} | advance Rs ${supAdvanceSum.toLocaleString('en-PK')}`);
  console.log(`  Customers: ${customers.length} | receivable Rs ${recSum.toLocaleString('en-PK')} | payable Rs ${paySum.toLocaleString('en-PK')}`);
  if (dryRun) {
    await prisma.$disconnect();
    return;
  }

  await wipe();

  // --- Suppliers ---
  for (const s of suppliers) {
    const supplier = await prisma.supplier.create({
      data: { name: s.name.trim(), phone: normalizePhone(s.phone), address: null },
    });
    if (s.kind === 'payable') {
      await prisma.purchase.create({
        data: { supplierId: supplier.id, totalAmount: dec(s.amount), notes: NOTE },
      });
    } else {
      await prisma.supplierPayment.create({
        data: { supplierId: supplier.id, amount: dec(s.amount), notes: NOTE },
      });
    }
  }

  // --- Customers ---
  // Every row in the report is a distinct account (the DB was wiped above), so
  // we seed all of them. No dedup: some accounts legitimately share a name
  // (e.g. a village name) with different phones / balances.
  let created = 0;
  for (const c of customers) {
    const phone = normalizePhone(c.phone);
    const balance = Number(c.advanceBalance ?? 0);
    const customer = await prisma.customer.create({
      data: { name: c.name.trim(), phone, address: null, advanceBalance: dec(balance) },
    });
    if (balance !== 0) {
      await prisma.customerAdvanceEntry.create({
        data: { customerId: customer.id, amount: dec(balance), notes: NOTE },
      });
    }
    created += 1;
  }

  const [supN, custN] = await Promise.all([
    prisma.supplier.count(),
    prisma.customer.count(),
  ]);

  const [recAgg, payAgg] = await Promise.all([
    prisma.customerAdvanceEntry.aggregate({ _sum: { amount: true }, where: { amount: { lt: 0 } } }),
    prisma.customerAdvanceEntry.aggregate({ _sum: { amount: true }, where: { amount: { gt: 0 } } }),
  ]);
  console.log('\nSeed complete.');
  console.log(`  Suppliers in DB: ${supN}`);
  console.log(`  Customers created: ${created} (db total ${custN})`);
  console.log(`  DB receivable: Rs ${Math.abs(Number(recAgg._sum.amount || 0)).toLocaleString('en-PK')}`);
  console.log(`  DB payable:    Rs ${Number(payAgg._sum.amount || 0).toLocaleString('en-PK')}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
