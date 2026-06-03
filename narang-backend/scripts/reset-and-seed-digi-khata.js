/**
 * Wipe all business data (keep User + Settings) and seed Digi Khata opening
 * balances: 9 suppliers into the Supplier table, the rest into Customer.
 *
 *   node scripts/reset-and-seed-digi-khata.js --dry-run
 *   node scripts/reset-and-seed-digi-khata.js
 *
 * Source: data/digi-khata-parties.json (verified exact parse of both PDFs).
 * Suppliers are matched by phone. A supplier "payable" (we owe them) is seeded
 * as an opening Purchase; a supplier "advance" (we paid ahead) as a
 * SupplierPayment. Customer receivable -> advanceBalance < 0, payable -> > 0.
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PrismaClient, Prisma } from '@prisma/client';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dryRun = process.argv.includes('--dry-run');
const prisma = new PrismaClient();

const NOTE = 'Opening balance from Digi Khata (01 Jun 2026)';
const inputPath = join(__dirname, '../data/digi-khata-parties.json');

// 9 suppliers from Suppliers_List_Report, keyed by normalized phone.
const SUPPLIER_PHONES = new Set([
  '03220011208', // Raees Mughal Nrg Vanda Dlr   payable 30,000
  '03454774740', // Bahi Habib 345               payable 2,197,357
  '03444406647', // Gulfam Bhatti Gandum Khata    payable 679,975
  '03466312536', // Ansar Iftkhar Traders Nrg     payable 13,000
  '03444958601', // Arshad Khal Stor NRG          payable 165,079
  '03026252858', // Ateeq 51 No. Sell Officer     payable 505,700
  '03026339996', // Najam Sunagri F.O             advance 79,000
  '03018217677', // Farhan Malhi Fo UPL Arysta    advance 34
  '03016669320', // Iftekhar Yaqoob FO Plant4Life payable 300
]);

function normalizePhone(phone) {
  if (!phone) return null;
  let d = String(phone).replace(/\D/g, '');
  if (d.startsWith('92')) d = `0${d.slice(2)}`;
  else if (!d.startsWith('0')) d = `0${d}`;
  return d.length >= 10 ? d.slice(0, 11) : null;
}

const dec = (n) => new Prisma.Decimal(n);

async function wipe() {
  // Delete children before parents to satisfy FK constraints.
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
  const parties = JSON.parse(readFileSync(inputPath, 'utf8'));

  // Split source rows into suppliers vs customers by phone.
  const suppliers = [];
  const customers = [];
  for (const row of parties) {
    const phone = normalizePhone(row.phone);
    if (phone && SUPPLIER_PHONES.has(phone)) suppliers.push({ ...row, phone });
    else customers.push({ ...row, phone });
  }

  console.log(dryRun ? '[DRY RUN] no writes' : 'LIVE RUN — wiping + seeding');
  console.log(`  Source rows:    ${parties.length}`);
  console.log(`  -> suppliers:   ${suppliers.length}`);
  console.log(`  -> customers:   ${customers.length}`);

  if (suppliers.length !== SUPPLIER_PHONES.size) {
    throw new Error(
      `Expected ${SUPPLIER_PHONES.size} supplier matches, found ${suppliers.length}. Aborting.`
    );
  }

  if (dryRun) {
    console.log('\n  Suppliers to create:');
    for (const s of suppliers) {
      const kind = s.payable ? `payable ${s.payable}` : `advance ${s.receivable}`;
      console.log(`    ${s.name} (${s.phone}) — ${kind}`);
    }
    await prisma.$disconnect();
    return;
  }

  await wipe();

  // --- Suppliers ---
  let supPurchase = 0;
  let supAdvance = 0;
  for (const s of suppliers) {
    const supplier = await prisma.supplier.create({
      data: { name: s.name.trim(), phone: s.phone, address: null },
    });
    if (s.payable) {
      // We owe them: opening Purchase raises payable balance.
      await prisma.purchase.create({
        data: {
          supplierId: supplier.id,
          totalAmount: dec(s.payable),
          notes: NOTE,
        },
      });
      supPurchase += Number(s.payable);
    } else if (s.receivable) {
      // We paid ahead: SupplierPayment lowers payable into advance.
      await prisma.supplierPayment.create({
        data: {
          supplierId: supplier.id,
          amount: dec(s.receivable),
          notes: NOTE,
        },
      });
      supAdvance += Number(s.receivable);
    }
  }

  // --- Customers ---
  let custCreated = 0;
  let custReceivable = 0;
  let custPayable = 0;
  const seenPhone = new Set();
  const seenName = new Set();
  for (const c of customers) {
    const nameKey = c.name.trim().toLowerCase();
    if (c.phone && seenPhone.has(c.phone)) continue;
    if (!c.phone && seenName.has(nameKey)) continue;

    const balance = Number(c.advanceBalance ?? 0);
    const customer = await prisma.customer.create({
      data: {
        name: c.name.trim(),
        phone: c.phone,
        address: null,
        advanceBalance: dec(balance),
      },
    });
    if (balance !== 0) {
      await prisma.customerAdvanceEntry.create({
        data: { customerId: customer.id, amount: dec(balance), notes: NOTE },
      });
    }
    if (balance < 0) custReceivable += Math.abs(balance);
    if (balance > 0) custPayable += balance;
    if (c.phone) seenPhone.add(c.phone);
    seenName.add(nameKey);
    custCreated += 1;
  }

  const [supN, custN] = await Promise.all([
    prisma.supplier.count(),
    prisma.customer.count(),
  ]);

  console.log('\nSeed complete.');
  console.log(`  Suppliers created:      ${supN}`);
  console.log(`    opening payable sum:  Rs ${supPurchase.toLocaleString('en-PK')}`);
  console.log(`    advance sum:          Rs ${supAdvance.toLocaleString('en-PK')}`);
  console.log(`  Customers created:      ${custCreated} (db total ${custN})`);
  console.log(`    receivable sum:       Rs ${custReceivable.toLocaleString('en-PK')}`);
  console.log(`    payable sum:          Rs ${custPayable.toLocaleString('en-PK')}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
