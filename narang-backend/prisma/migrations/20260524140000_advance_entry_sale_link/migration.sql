-- AlterTable
ALTER TABLE "CustomerAdvanceEntry" ADD COLUMN "saleId" TEXT;

-- AddForeignKey
ALTER TABLE "CustomerAdvanceEntry" ADD CONSTRAINT "CustomerAdvanceEntry_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
