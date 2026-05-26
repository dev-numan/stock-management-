-- AlterTable
ALTER TABLE "Product" ADD COLUMN "expiryDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN "showLowStockAlert" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Settings" ADD COLUMN "showExpiryAlert" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Settings" ADD COLUMN "expiryAlertMonths" INTEGER NOT NULL DEFAULT 3;
