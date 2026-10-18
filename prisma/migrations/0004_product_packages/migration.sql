CREATE TABLE "ProductPackage" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductPackage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductPackageItem" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductPackageItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductPackage_vendorId_idx" ON "ProductPackage"("vendorId");
CREATE UNIQUE INDEX "ProductPackage_vendorId_name_key" ON "ProductPackage"("vendorId", "name");

CREATE INDEX "ProductPackageItem_productId_idx" ON "ProductPackageItem"("productId");
CREATE INDEX "ProductPackageItem_packageId_idx" ON "ProductPackageItem"("packageId");
CREATE UNIQUE INDEX "ProductPackageItem_packageId_productId_key" ON "ProductPackageItem"("packageId", "productId");

ALTER TABLE "ProductPackage"
ADD CONSTRAINT "ProductPackage_vendorId_fkey"
FOREIGN KEY ("vendorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductPackageItem"
ADD CONSTRAINT "ProductPackageItem_packageId_fkey"
FOREIGN KEY ("packageId") REFERENCES "ProductPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductPackageItem"
ADD CONSTRAINT "ProductPackageItem_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
