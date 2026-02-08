-- AlterTable
ALTER TABLE "BankAccount" ADD COLUMN "interestRate" DECIMAL(5,2);

-- CreateTable
CREATE TABLE "Loan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "institution" VARCHAR(50) NOT NULL,
    "originalAmount" DECIMAL(12,2) NOT NULL,
    "remainingBalance" DECIMAL(12,2) NOT NULL,
    "currency" "Currency" NOT NULL,
    "monthlyPayment" DECIMAL(12,2) NOT NULL,
    "interestRate" DECIMAL(5,2) NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "frequency" "RecurringFrequency" NOT NULL DEFAULT 'monthly',
    "color" VARCHAR(7),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Loan_userId_idx" ON "Loan"("userId");

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
