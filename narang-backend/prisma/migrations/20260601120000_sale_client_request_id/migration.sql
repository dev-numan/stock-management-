-- Idempotent mobile sales: same clientRequestId cannot create two rows
ALTER TABLE "Sale" ADD COLUMN "clientRequestId" TEXT;

CREATE UNIQUE INDEX "Sale_clientRequestId_key" ON "Sale"("clientRequestId");
