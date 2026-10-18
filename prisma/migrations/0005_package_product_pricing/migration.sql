CREATE TYPE "ProductKind" AS ENUM ('STANDARD', 'PACKAGE');

ALTER TABLE "Product"
ADD COLUMN "kind" "ProductKind" NOT NULL DEFAULT 'STANDARD';

ALTER TABLE "ProductPackage"
ADD COLUMN "baseTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN "discountAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN "finalTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN "packageProductId" TEXT;

CREATE UNIQUE INDEX "ProductPackage_packageProductId_key" ON "ProductPackage"("packageProductId");

ALTER TABLE "ProductPackage"
ADD CONSTRAINT "ProductPackage_packageProductId_fkey"
FOREIGN KEY ("packageProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
