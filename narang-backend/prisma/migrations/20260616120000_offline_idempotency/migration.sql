-- Generic idempotency keys so offline-replayed mutations apply at most once.
-- The key row is written in the same transaction as the mutation, so a failed
-- write rolls the key back (safe to retry) while a replay short-circuits.
CREATE TABLE "IdempotencyKey" (
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("key")
);
