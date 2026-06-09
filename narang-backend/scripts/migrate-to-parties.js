/**
 * One-time migration: Customer + Supplier → unified Party.
 * Run AFTER prisma migrate deploy applies 20260610120000_unified_party.
 *
 *   node scripts/migrate-to-parties.js
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function normalizePhone(phone) {
  if (!phone) return '';
  return String(phone).replace(/\D/g, '');
}

async function tableExists(name) {
  const rows = await prisma.$queryRaw`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${name}
    ) AS exists
  `;
  return Boolean(rows[0]?.exists);
}

async function main() {
  const hasCustomer = await tableExists('Customer');
  const hasParty = await tableExists('Party');

  if (!hasParty) {
    throw new Error('Party table missing — run prisma migrate deploy first.');
  }

  const partyCount = await prisma.party.count();
  if (partyCount > 0) {
    console.log(`Party table already has ${partyCount} rows — skipping data migration.`);
    return;
  }

  if (!hasCustomer) {
    console.log('No legacy Customer table — fresh database, nothing to migrate.');
    return;
  }

  console.log('Migrating Customer/Supplier data to Party...');

  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`
        INSERT INTO "Party" (id, name, phone, address, "partyType", "advanceBalance", "createdAt")
        SELECT id, name, phone, address, 'CUSTOMER'::"PartyType", "advanceBalance", "createdAt"
        FROM "Customer"
      `;

      const customers = await tx.$queryRaw`SELECT id, phone FROM "Customer"`;
      const phoneToPartyId = new Map();
      for (const c of customers) {
        const key = normalizePhone(c.phone);
        if (key) phoneToPartyId.set(key, c.id);
      }

      const suppliers = await tx.$queryRaw`
        SELECT id, name, phone, address, "createdAt" FROM "Supplier"
      `;
      const supplierToPartyId = new Map();

      for (const s of suppliers) {
        const key = normalizePhone(s.phone);
        const mergedId = key && phoneToPartyId.has(key) ? phoneToPartyId.get(key) : null;

        if (mergedId) {
          supplierToPartyId.set(s.id, mergedId);
          continue;
        }

        await tx.$executeRaw`
          INSERT INTO "Party" (id, name, phone, address, "partyType", "advanceBalance", "createdAt")
          VALUES (${s.id}, ${s.name}, ${s.phone}, ${s.address}, 'SUPPLIER'::"PartyType", 0, ${s.createdAt})
        `;
        supplierToPartyId.set(s.id, s.id);
        if (key) phoneToPartyId.set(key, s.id);
      }

      await tx.$executeRaw`
        UPDATE "Sale" SET "partyId" = "customerId" WHERE "customerId" IS NOT NULL
      `;

      await tx.$executeRaw`
        INSERT INTO "PartyAdvanceEntry" (id, "partyId", "saleId", amount, notes, "createdAt")
        SELECT id, "customerId", "saleId", amount, notes, "createdAt"
        FROM "CustomerAdvanceEntry"
      `;

      for (const [supplierId, partyId] of supplierToPartyId) {
        await tx.$executeRaw`
          UPDATE "Purchase" SET "partyId" = ${partyId} WHERE "supplierId" = ${supplierId}
        `;
        await tx.$executeRaw`
          UPDATE "Product" SET "partyId" = ${partyId} WHERE "supplierId" = ${supplierId}
        `;
        await tx.$executeRaw`
          INSERT INTO "PartyPayment" (id, "partyId", amount, notes, "createdAt")
          SELECT id, ${partyId}, amount, notes, "createdAt"
          FROM "SupplierPayment" WHERE "supplierId" = ${supplierId}
        `;
      }

      await tx.$executeRaw`ALTER TABLE "Sale" DROP CONSTRAINT IF EXISTS "Sale_customerId_fkey"`;
      await tx.$executeRaw`ALTER TABLE "Sale" DROP COLUMN IF EXISTS "customerId"`;
      await tx.$executeRaw`DROP TABLE IF EXISTS "CustomerAdvanceEntry" CASCADE`;
      await tx.$executeRaw`DROP TABLE IF EXISTS "Customer" CASCADE`;
      await tx.$executeRaw`ALTER TABLE "Purchase" DROP CONSTRAINT IF EXISTS "Purchase_supplierId_fkey"`;
      await tx.$executeRaw`ALTER TABLE "Purchase" DROP COLUMN IF EXISTS "supplierId"`;
      await tx.$executeRaw`DROP TABLE IF EXISTS "SupplierPayment" CASCADE`;
      await tx.$executeRaw`DROP TABLE IF EXISTS "Supplier" CASCADE`;
      await tx.$executeRaw`ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_supplierId_fkey"`;
      await tx.$executeRaw`ALTER TABLE "Product" DROP COLUMN IF EXISTS "supplierId"`;
    },
    { timeout: 120000 }
  );

  const counts = {
    parties: await prisma.party.count(),
    salesWithParty: await prisma.sale.count({ where: { partyId: { not: null } } }),
    advanceEntries: await prisma.partyAdvanceEntry.count(),
    payments: await prisma.partyPayment.count(),
    purchasesWithParty: await prisma.purchase.count({ where: { partyId: { not: null } } }),
  };
  console.log('Migration complete:', counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
