CREATE TABLE IF NOT EXISTS "VendorPolicyTemplate" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VendorPolicyTemplate_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Installment"
  ADD COLUMN IF NOT EXISTS "policyTemplateId" TEXT,
  ADD COLUMN IF NOT EXISTS "policyTemplateName" TEXT,
  ADD COLUMN IF NOT EXISTS "policyTemplateContent" TEXT,
  ADD COLUMN IF NOT EXISTS "policyAppliedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "policyAcceptedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "VendorPolicyTemplate_vendorId_idx" ON "VendorPolicyTemplate"("vendorId");
CREATE UNIQUE INDEX IF NOT EXISTS "VendorPolicyTemplate_vendorId_name_key" ON "VendorPolicyTemplate"("vendorId", "name");
CREATE INDEX IF NOT EXISTS "Installment_policyTemplateId_idx" ON "Installment"("policyTemplateId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'VendorPolicyTemplate_vendorId_fkey'
  ) THEN
    ALTER TABLE "VendorPolicyTemplate"
      ADD CONSTRAINT "VendorPolicyTemplate_vendorId_fkey"
      FOREIGN KEY ("vendorId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Installment_policyTemplateId_fkey'
  ) THEN
    ALTER TABLE "Installment"
      ADD CONSTRAINT "Installment_policyTemplateId_fkey"
      FOREIGN KEY ("policyTemplateId") REFERENCES "VendorPolicyTemplate"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
