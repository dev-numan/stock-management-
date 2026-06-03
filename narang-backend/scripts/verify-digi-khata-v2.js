/**
 * Read-only verification that the seeded DB matches data/digi-khata-v2.json.
 *   node scripts/verify-digi-khata-v2.js
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PrismaClient } from '@prisma/client';

const __dirname = dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();
const num = (v) => Number(v ?? 0);

function normalizePhone(phone) {
  if (!phone) return null;
  let d = String(phone).replace(/\D/g, '');
  if (d.startsWith('92')) d = `0${d.slice(2)}`;
  else if (!d.startsWith('0')) d = `0${d}`;
  return d.length >= 10 ? d.slice(0, 11) : null;
}

async function main() {
  const { customers, suppliers } = JSON.parse(
    readFileSync(join(__dirname, '../data/digi-khata-v2.json'), 'utf8')
  );
  let problems = 0;
  const fail = (m) => { problems += 1; console.log('  ✗', m); };

  // ---------- SUPPLIERS ----------
  console.log('SUPPLIERS');
  const dbSuppliers = await prisma.supplier.findMany();
  if (dbSuppliers.length !== suppliers.length)
    fail(`count ${dbSuppliers.length} != source ${suppliers.length}`);

  for (const s of suppliers) {
    const phone = normalizePhone(s.phone);
    const db = dbSuppliers.find((d) => normalizePhone(d.phone) === phone);
    if (!db) { fail(`missing supplier ${s.name} (${phone})`); continue; }
    const [pur, pay] = await Promise.all([
      prisma.purchase.aggregate({ _sum: { totalAmount: true }, where: { supplierId: db.id } }),
      prisma.supplierPayment.aggregate({ _sum: { amount: true }, where: { supplierId: db.id } }),
    ]);
    const payable = num(pur._sum.totalAmount) - num(pay._sum.amount);
    const expected = s.kind === 'payable' ? s.amount : -s.amount;
    if (payable !== expected)
      fail(`${s.name}: DB payable ${payable} != expected ${expected}`);
  }
  console.log(`  checked ${suppliers.length} suppliers`);

  // ---------- CUSTOMERS ----------
  console.log('CUSTOMERS');
  const dbCustomers = await prisma.customer.findMany();
  if (dbCustomers.length !== customers.length)
    fail(`count ${dbCustomers.length} != source ${customers.length}`);

  // 1) Multiset of advanceBalance values must match exactly.
  const bag = (arr) => {
    const m = new Map();
    for (const v of arr) m.set(v, (m.get(v) || 0) + 1);
    return m;
  };
  const expBag = bag(customers.map((c) => num(c.advanceBalance)));
  const actBag = bag(dbCustomers.map((c) => num(c.advanceBalance)));
  let multisetOk = expBag.size === actBag.size;
  for (const [v, n] of expBag) if (actBag.get(v) !== n) { multisetOk = false; break; }
  if (!multisetOk) fail('customer balance multiset differs from source');
  else console.log('  balance multiset matches source exactly');

  // 2) Each customer's ledger entry sum must equal its advanceBalance.
  const entries = await prisma.customerAdvanceEntry.groupBy({
    by: ['customerId'], _sum: { amount: true },
  });
  const entryMap = new Map(entries.map((e) => [e.customerId, num(e._sum.amount)]));
  let ledgerMismatch = 0;
  for (const c of dbCustomers) {
    const bal = num(c.advanceBalance);
    const led = entryMap.get(c.id) || 0;
    if (bal !== led && !(bal === 0 && led === 0)) ledgerMismatch += 1;
  }
  if (ledgerMismatch) fail(`${ledgerMismatch} customers: advanceBalance != ledger entry sum`);
  else console.log('  every customer advanceBalance matches its ledger entry');

  // ---------- TOTALS ----------
  const sumPos = (arr, f) => arr.reduce((a, x) => a + Math.max(0, f(x)), 0);
  const sumNeg = (arr, f) => arr.reduce((a, x) => a + Math.min(0, f(x)), 0);
  const dbRecv = -sumNeg(dbCustomers, (c) => num(c.advanceBalance));
  const dbPay = sumPos(dbCustomers, (c) => num(c.advanceBalance));
  const srcRecv = customers.reduce((a, c) => a + (c.receivable || 0), 0);
  const srcPay = customers.reduce((a, c) => a + (c.payable || 0), 0);
  console.log('TOTALS');
  console.log(`  customer receivable: DB ${dbRecv.toLocaleString('en-PK')} | src ${srcRecv.toLocaleString('en-PK')} ${dbRecv === srcRecv ? '✓' : '✗'}`);
  console.log(`  customer payable:    DB ${dbPay.toLocaleString('en-PK')} | src ${srcPay.toLocaleString('en-PK')} ${dbPay === srcPay ? '✓' : '✗'}`);
  if (dbRecv !== srcRecv || dbPay !== srcPay) problems += 1;

  console.log(`\n${problems === 0 ? '✅ ALL AMOUNTS CORRECT' : `❌ ${problems} problem(s) found`}`);
  process.exitCode = problems === 0 ? 0 : 1;
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
