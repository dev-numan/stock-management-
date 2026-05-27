-- Product categories are fixed in code; store category name on Product.

ALTER TABLE "Product" ADD COLUMN "category" TEXT;

UPDATE "Product" p
SET "category" = c."name"
FROM "Category" c
WHERE p."categoryId" = c."id";

UPDATE "Product" SET "category" = 'Other' WHERE "category" IS NULL;

ALTER TABLE "Product" ALTER COLUMN "category" SET NOT NULL;

ALTER TABLE "Product" DROP CONSTRAINT "Product_categoryId_fkey";
ALTER TABLE "Product" DROP COLUMN "categoryId";

DROP TABLE "Category";
