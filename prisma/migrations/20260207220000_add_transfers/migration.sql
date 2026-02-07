-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'transfer';

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "targetAccountId" TEXT;

-- AlterTable
ALTER TABLE "RecurringTransaction" ADD COLUMN "targetAccountId" TEXT;

-- CreateIndex
CREATE INDEX "Transaction_targetAccountId_idx" ON "Transaction"("targetAccountId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_targetAccountId_fkey" FOREIGN KEY ("targetAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringTransaction" ADD CONSTRAINT "RecurringTransaction_targetAccountId_fkey" FOREIGN KEY ("targetAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
