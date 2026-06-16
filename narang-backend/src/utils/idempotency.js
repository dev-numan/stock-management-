/**
 * Run a write at most once per clientRequestId.
 *
 * The offline mobile client retries queued mutations on reconnect, and a
 * request can succeed on the server while its response is lost — so the client
 * replays an op the server already applied. To make that safe, we record the
 * clientRequestId in the `IdempotencyKey` table inside the SAME transaction as
 * the write:
 *   - First run: key insert + `work` commit together.
 *   - Failed run: the transaction (including the key) rolls back → safe retry.
 *   - Replay of a committed op: the key insert hits the PK constraint (P2002),
 *     the transaction rolls back, and we return `onDuplicate` instead of
 *     applying the write twice.
 *
 * No clientRequestId → behaves like a plain transaction (backward compatible).
 *
 * `onDuplicate(db)` receives the top-level client to read current state; the
 * inner `tx` is unusable after the rollback.
 *
 * @param {import('@prisma/client').PrismaClient} db
 * @param {string|undefined|null} clientRequestId
 * @param {(tx: any) => Promise<any>} work
 * @param {(db: any) => Promise<any>} [onDuplicate]
 * @param {object} [opts] transaction options (maxWait/timeout)
 */
export async function runIdempotent(db, clientRequestId, work, onDuplicate, opts) {
  const key = typeof clientRequestId === 'string' ? clientRequestId.trim() : '';
  if (!key) {
    return db.$transaction((tx) => work(tx), opts);
  }

  try {
    return await db.$transaction(async (tx) => {
      await tx.idempotencyKey.create({ data: { key } });
      return work(tx);
    }, opts);
  } catch (err) {
    if (err?.code === 'P2002') {
      // A P2002 here could be the key (true duplicate) OR an unrelated unique
      // constraint inside `work`. The key only exists if a PRIOR run committed
      // it, so check before deciding.
      const seen = await db.idempotencyKey.findUnique({ where: { key } });
      if (seen) return onDuplicate ? onDuplicate(db) : { duplicate: true };
    }
    throw err;
  }
}
