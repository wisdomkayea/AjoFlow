CREATE TABLE "VendorPolicyTemplate" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorPolicyTemplate_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Installment"
ADD COLUMN "policyTemplateId" TEXT,
ADD COLUMN "policyTemplateName" TEXT,
ADD COLUMN "policyTemplateContent" TEXT,
ADD COLUMN "policyAppliedAt" TIMESTAMP(3),
ADD COLUMN "policyAcceptedAt" TIMESTAMP(3);

CREATE INDEX "VendorPolicyTemplate_vendorId_idx" ON "VendorPolicyTemplate"("vendorId");
CREATE UNIQUE INDEX "VendorPolicyTemplate_vendorId_name_key" ON "VendorPolicyTemplate"("vendorId", "name");

CREATE INDEX "Installment_policyTemplateId_idx" ON "Installment"("policyTemplateId");

ALTER TABLE "VendorPolicyTemplate"
ADD CONSTRAINT "VendorPolicyTemplate_vendorId_fkey"
FOREIGN KEY ("vendorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Installment"
ADD CONSTRAINT "Installment_policyTemplateId_fkey"
FOREIGN KEY ("policyTemplateId") REFERENCES "VendorPolicyTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
