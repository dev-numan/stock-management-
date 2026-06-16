-- Idempotent offline creates for parties and products (same pattern as Sale).
ALTER TABLE "Party" ADD COLUMN "clientRequestId" TEXT;
CREATE UNIQUE INDEX "Party_clientRequestId_key" ON "Party"("clientRequestId");

ALTER TABLE "Product" ADD COLUMN "clientRequestId" TEXT;
CREATE UNIQUE INDEX "Product_clientRequestId_key" ON "Product"("clientRequestId");
