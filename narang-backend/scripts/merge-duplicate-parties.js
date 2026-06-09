/**
 * Merge duplicate Party rows that share normalized phone or name.
 * Keeps the oldest createdAt row as canonical (per user preference).
 *
 *   node scripts/merge-duplicate-parties.js --dry-run
 *   node scripts/merge-duplicate-parties.js
 */
import { PrismaClient, Prisma } from '@prisma/client';
import { normalizePhone } from '../src/utils/partyResolve.js';

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');

function groupKey(party) {
  const phoneKey = normalizePhone(party.phone);
  if (phoneKey) return `phone:${phoneKey}`;
  const name = party.name?.trim().toLowerCase();
  if (name) return `name:${name}`;
  return `id:${party.id}`;
}

async function relinkDuplicates(tx, duplicateId, canonicalId) {
  await tx.sale.updateMany({ where: { partyId: duplicateId }, data: { partyId: canonicalId } });
  await tx.purchase.updateMany({ where: { partyId: duplicateId }, data: { partyId: canonicalId } });
  await tx.product.updateMany({ where: { partyId: duplicateId }, data: { partyId: canonicalId } });
  await tx.partyAdvanceEntry.updateMany({
    where: { partyId: duplicateId },
    data: { partyId: canonicalId },
  });
  await tx.partyPayment.updateMany({
    where: { partyId: duplicateId },
    data: { partyId: canonicalId },
  });
}

async function main() {
  const parties = await prisma.party.findMany({ orderBy: { createdAt: 'asc' } });
  const groups = new Map();

  for (const party of parties) {
    const key = groupKey(party);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(party);
  }

  const mergePlans = [];
  for (const [key, list] of groups.entries()) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const canonical = sorted[0];
    const duplicates = sorted.slice(1);
    mergePlans.push({ key, canonical, duplicates });
  }

  if (mergePlans.length === 0) {
    console.log('No duplicate party groups found.');
    return;
  }

  console.log(`${dryRun ? '[dry-run] ' : ''}Found ${mergePlans.length} duplicate group(s):\n`);
  for (const plan of mergePlans) {
    console.log(`  ${plan.key}`);
    console.log(`    keep: ${plan.canonical.name} (${plan.canonical.id}) type=${plan.canonical.partyType}`);
    for (const d of plan.duplicates) {
      console.log(`    merge: ${d.name} (${d.id}) type=${d.partyType}`);
    }
  }

  if (dryRun) {
    console.log('\nDry run — no changes written.');
    return;
  }

  let merged = 0;
  await prisma.$transaction(
    async (tx) => {
      for (const plan of mergePlans) {
        const { canonical, duplicates } = plan;
        let advanceSum = new Prisma.Decimal(canonical.advanceBalance ?? 0);

        for (const dup of duplicates) {
          await relinkDuplicates(tx, dup.id, canonical.id);
          advanceSum = advanceSum.add(dup.advanceBalance ?? 0);
          await tx.party.delete({ where: { id: dup.id } });
          merged += 1;
        }

        await tx.party.update({
          where: { id: canonical.id },
          data: { advanceBalance: advanceSum },
        });
      }
    },
    { timeout: 120000 }
  );

  const remaining = await prisma.party.count();
  console.log(`\nMerged ${merged} duplicate row(s). Parties remaining: ${remaining}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
