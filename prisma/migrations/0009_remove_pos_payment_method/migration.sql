UPDATE "Payment"
SET "method" = 'TRANSFER'
WHERE "method"::text = 'POS';

CREATE TYPE "PaymentMethod_new" AS ENUM ('CASH', 'TRANSFER', 'SYSTEM');

ALTER TABLE "Payment"
ALTER COLUMN "method" DROP DEFAULT;

ALTER TABLE "Payment"
ALTER COLUMN "method" TYPE "PaymentMethod_new"
USING ("method"::text::"PaymentMethod_new");

DROP TYPE "PaymentMethod";
ALTER TYPE "PaymentMethod_new" RENAME TO "PaymentMethod";

ALTER TABLE "Payment"
ALTER COLUMN "method" SET DEFAULT 'SYSTEM';
