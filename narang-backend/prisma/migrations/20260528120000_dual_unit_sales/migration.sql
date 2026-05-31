-- AlterTable: Product alternate sale unit
ALTER TABLE "Product" ADD COLUMN "alternateSaleUnit" "Unit";
ALTER TABLE "Product" ADD COLUMN "unitsPerStockUnit" DECIMAL(65,30);

-- AlterTable: SaleItem sold unit (backfill from product primary unit)
ALTER TABLE "SaleItem" ADD COLUMN "soldUnit" "Unit";

UPDATE "SaleItem" si
SET "soldUnit" = p.unit
FROM "Product" p
WHERE si."productId" = p.id AND si."soldUnit" IS NULL;

ALTER TABLE "SaleItem" ALTER COLUMN "soldUnit" SET NOT NULL;
