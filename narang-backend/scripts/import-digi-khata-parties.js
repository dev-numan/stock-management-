/**
 * Import Digi Khata opening balances into Customer table.
 *
 *   node scripts/import-digi-khata-parties.js
 *   node scripts/import-digi-khata-parties.js --dry-run
 *   node scripts/import-digi-khata-parties.js --file ../narang-mobile/customer.json
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PrismaClient, Prisma } from '@prisma/client';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dryRun = process.argv.includes('--dry-run');
const fileArgIdx = process.argv.indexOf('--file');
const inputPath =
  fileArgIdx >= 0 && process.argv[fileArgIdx + 1]
    ? process.argv[fileArgIdx + 1]
    : join(__dirname, '../../narang-mobile/customer.json');
const prisma = new PrismaClient();

const IMPORT_NOTE = 'Opening balance from Digi Khata (31 May 2026)';

function normalizePhone(phone) {
  if (!phone) return null;
  let d = String(phone).replace(/\D/g, '');
  if (d.startsWith('92')) d = `0${d.slice(2)}`;
  else if (!d.startsWith('0')) d = `0${d}`;
  return d.length >= 10 ? d.slice(0, 11) : null;
}

function loadParties(filePath) {
  const raw = JSON.parse(readFileSync(filePath, 'utf8'));
  if (Array.isArray(raw)) return raw;

  const customers = raw?.report?.customers;
  if (!Array.isArray(customers)) {
    throw new Error(`No customer list found in ${filePath}`);
  }

  return customers.map((row) => {
    const receivable = Number(row.receivable ?? 0);
    const payable = Number(row.payable ?? 0);
    let advanceBalance = 0;
    if (receivable > 0) advanceBalance = -receivable;
    else if (payable > 0) advanceBalance = payable;

    return {
      num: row['#'] ?? row.num,
      name: row.name,
      phone: row.phone,
      advanceBalance,
      receivable: receivable || null,
      payable: payable || null,
    };
  });
}

async function main() {
  const parties = loadParties(inputPath);

  const existing = await prisma.customer.findMany({
    select: { phone: true, name: true },
  });
  const phoneSet = new Set(existing.map((c) => normalizePhone(c.phone)).filter(Boolean));
  const nameSet = new Set(existing.map((c) => c.name.trim().toLowerCase()));

  let created = 0;
  let skipped = 0;
  let receivableTotal = 0;
  let payableTotal = 0;

  for (const row of parties) {
    const balance = Number(row.advanceBalance ?? 0);
    const phone = normalizePhone(row.phone);
    const nameKey = row.name.trim().toLowerCase();

    if (phone && phoneSet.has(phone)) {
      skipped += 1;
      continue;
    }
    if (!phone && nameSet.has(nameKey)) {
      skipped += 1;
      continue;
    }

    if (balance < 0) receivableTotal += Math.abs(balance);
    if (balance > 0) payableTotal += balance;

    if (dryRun) {
      created += 1;
      continue;
    }

    try {
      const customer = await prisma.customer.create({
        data: {
          name: row.name.trim(),
          phone,
          address: null,
          advanceBalance: new Prisma.Decimal(balance),
        },
      });

      if (balance !== 0) {
        await prisma.customerAdvanceEntry.create({
          data: {
            customerId: customer.id,
            amount: new Prisma.Decimal(balance),
            notes: IMPORT_NOTE,
          },
        });
      }

      if (phone) phoneSet.add(phone);
      nameSet.add(nameKey);
      created += 1;
    } catch (err) {
      console.error(`Skip #${row.num} ${row.name}:`, err.message);
      skipped += 1;
    }
  }

  const customerCount = dryRun ? null : await prisma.customer.count();

  console.log(dryRun ? '[DRY RUN]' : 'Import complete');
  console.log(`  Source file:     ${inputPath}`);
  console.log(`  Parties in file: ${parties.length}`);
  console.log(`  Imported now:    ${created}`);
  console.log(`  Skipped:         ${skipped}`);
  console.log(`  Batch receivable sum: Rs ${receivableTotal.toLocaleString('en-PK')}`);
  console.log(`  Batch payable sum:    Rs ${payableTotal.toLocaleString('en-PK')}`);
  if (customerCount != null) {
    console.log(`  Total DB customers: ${customerCount}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
