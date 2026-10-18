DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'PaymentMethod'
  ) THEN
    CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TRANSFER', 'POS', 'SYSTEM');
  END IF;
END $$;

ALTER TABLE "Payment"
  ADD COLUMN IF NOT EXISTS "method" "PaymentMethod" NOT NULL DEFAULT 'SYSTEM',
  ADD COLUMN IF NOT EXISTS "reference" TEXT;
