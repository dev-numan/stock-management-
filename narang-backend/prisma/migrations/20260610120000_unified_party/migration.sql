-- CreateEnum
CREATE TYPE "PartyType" AS ENUM ('CUSTOMER', 'SUPPLIER');

-- CreateTable
CREATE TABLE "Party" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "partyType" "PartyType" NOT NULL DEFAULT 'CUSTOMER',
    "advanceBalance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PartyAdvanceEntry" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "saleId" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartyAdvanceEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PartyPayment" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartyPayment_pkey" PRIMARY KEY ("id")
);

-- Add partyId columns (legacy customerId/supplierId kept until data migration script runs)
ALTER TABLE "Sale" ADD COLUMN "partyId" TEXT;
ALTER TABLE "Purchase" ADD COLUMN "partyId" TEXT;
ALTER TABLE "Product" ADD COLUMN "partyId" TEXT;

CREATE INDEX "PartyAdvanceEntry_partyId_idx" ON "PartyAdvanceEntry"("partyId");
CREATE INDEX "PartyPayment_partyId_idx" ON "PartyPayment"("partyId");

ALTER TABLE "PartyAdvanceEntry" ADD CONSTRAINT "PartyAdvanceEntry_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PartyAdvanceEntry" ADD CONSTRAINT "PartyAdvanceEntry_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PartyPayment" ADD CONSTRAINT "PartyPayment_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE SET NULL ON UPDATE CASCADE;
