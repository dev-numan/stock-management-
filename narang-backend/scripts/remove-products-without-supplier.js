/**
 * Deletes products that have no supplier linked.
 *
 * Usage:
 *   node scripts/remove-products-without-supplier.js
 *   node scripts/remove-products-without-supplier.js --dry-run
 *   node scripts/remove-products-without-supplier.js --force
 *   node scripts/remove-products-without-supplier.js --force --dry-run
 *
 * --force  Also removes sale/purchase lines for that product (and empty sales).
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');
const force = process.argv.includes('--force');

async function recalculateSale(tx, saleId) {
  const sale = await tx.sale.findUnique({
    where: { id: saleId },
    include: { items: true },
  });
  if (!sale) return;

  if (sale.items.length === 0) {
    await tx.customerAdvanceEntry.deleteMany({ where: { saleId } });
    await tx.sale.delete({ where: { id: saleId } });
    return;
  }

  const subtotal = sale.items.reduce((sum, i) => sum + Number(i.total), 0);
  const taxPercent = Number(sale.taxPercent);
  const discount = Number(sale.discount);
  const taxAmount = (subtotal * taxPercent) / 100;
  const totalAmount = subtotal + taxAmount - discount;

  await tx.sale.update({
    where: { id: saleId },
    data: {
      subtotal,
      taxAmount,
      totalAmount,
    },
  });
}

async function forceRemoveProductRefs(client, productId) {
  const saleIds = [
    ...new Set(
      (
        await client.saleItem.findMany({
          where: { productId },
          select: { saleId: true },
        })
      ).map((r) => r.saleId)
    ),
  ];

  await client.purchaseItem.deleteMany({ where: { productId } });
  await client.saleItem.deleteMany({ where: { productId } });

  for (const saleId of saleIds) {
    await recalculateSale(client, saleId);
  }
}

async function deleteProduct(p, { dryRun: isDry, force: useForce }) {
  if (isDry) {
    const saleCount = await db.saleItem.count({ where: { productId: p.id } });
    const purchaseCount = await db.purchaseItem.count({ where: { productId: p.id } });
    const extra =
      saleCount || purchaseCount
        ? ` (${saleCount} sale line(s), ${purchaseCount} purchase line(s)${useForce ? ' — force would remove' : ''})`
        : '';
    console.log(`[dry-run] would delete: ${p.name}${extra}`);
    return { deleted: true };
  }

  if (useForce) {
    await forceRemoveProductRefs(db, p.id);
    await db.product.delete({ where: { id: p.id } });
    console.log(`Deleted (force): ${p.name}`);
    return { deleted: true };
  }

  await db.product.delete({ where: { id: p.id } });
  console.log(`Deleted: ${p.name}`);
  return { deleted: true };
}

async function main() {
  const products = await db.product.findMany({
    where: { supplierId: null },
    select: { id: true, name: true },
  });

  console.log(
    `Found ${products.length} product(s) without supplier.${force ? ' (--force)' : ''}${dryRun ? ' (dry-run)' : ''}`
  );

  if (products.length === 0) return;

  if (!force && !dryRun) {
    const blocked = await Promise.all(
      products.map(async (p) => {
        const [sales, purchases] = await Promise.all([
          db.saleItem.count({ where: { productId: p.id } }),
          db.purchaseItem.count({ where: { productId: p.id } }),
        ]);
        return sales + purchases > 0 ? p : null;
      })
    );
    const inUse = blocked.filter(Boolean);
    if (inUse.length > 0) {
      console.log(
        `\n${inUse.length} product(s) are used in past sales/purchases. Re-run with --force to remove those lines and delete the products:\n`
      );
      console.log('  npm run db:remove-products-no-supplier:force\n');
    }
  }

  let deleted = 0;
  let skipped = 0;

  for (const p of products) {
    try {
      const result = await deleteProduct(p, { dryRun, force });
      if (result.deleted) deleted += 1;
    } catch (err) {
      skipped += 1;
      const msg = err.message?.split('\n')[0] || err.code || String(err);
      console.warn(`Skipped: ${p.name} — ${msg}`);
    }
  }

  console.log(`Done. Deleted: ${deleted}, skipped: ${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
