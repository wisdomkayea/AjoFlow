CREATE TYPE "WithdrawalStatus" AS ENUM ('COMPLETED', 'FAILED');

CREATE TABLE "WalletWithdrawal" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletWithdrawal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WalletWithdrawal_vendorId_idx" ON "WalletWithdrawal"("vendorId");

ALTER TABLE "WalletWithdrawal" ADD CONSTRAINT "WalletWithdrawal_vendorId_fkey"
    FOREIGN KEY ("vendorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
