DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'PaymentSource'
  ) THEN
    CREATE TYPE "PaymentSource" AS ENUM ('MANUAL', 'AUTO');
  END IF;
END $$;

ALTER TABLE "Payment"
  ADD COLUMN IF NOT EXISTS "source" "PaymentSource" NOT NULL DEFAULT 'MANUAL';

UPDATE "Payment"
SET "source" = CASE
  WHEN "method" = 'SYSTEM' THEN CAST('AUTO' AS "PaymentSource")
  ELSE CAST('MANUAL' AS "PaymentSource")
END
WHERE "source" IS DISTINCT FROM CASE
  WHEN "method" = 'SYSTEM' THEN CAST('AUTO' AS "PaymentSource")
  ELSE CAST('MANUAL' AS "PaymentSource")
END;

UPDATE "Payment" p
SET "reference" = 'KRD-' || UPPER(RIGHT(regexp_replace(p."id", '[^0-9A-Za-z]', '', 'g'), 8))
FROM "Installment" i
JOIN "Product" pr ON pr."id" = i."productId"
WHERE p."installmentId" = i."id"
  AND p."reference" IS NOT NULL
  AND LOWER(TRIM(p."reference")) = LOWER(TRIM(pr."name"));
