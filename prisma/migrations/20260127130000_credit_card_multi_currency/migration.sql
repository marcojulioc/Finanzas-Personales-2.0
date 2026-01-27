-- CreateTable: CreditCardBalance for multi-currency support
CREATE TABLE "CreditCardBalance" (
    "id" TEXT NOT NULL,
    "creditCardId" TEXT NOT NULL,
    "currency" "Currency" NOT NULL,
    "creditLimit" DECIMAL(12,2) NOT NULL,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditCardBalance_pkey" PRIMARY KEY ("id")
);

-- Migrate existing data from CreditCard to CreditCardBalance
INSERT INTO "CreditCardBalance" ("id", "creditCardId", "currency", "creditLimit", "balance", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    "id",
    "currency",
    "creditLimit",
    "balance",
    "createdAt",
    "updatedAt"
FROM "CreditCard"
WHERE "creditLimit" > 0 OR "balance" > 0;

-- Drop old columns from CreditCard
ALTER TABLE "CreditCard" DROP COLUMN "currency";
ALTER TABLE "CreditCard" DROP COLUMN "creditLimit";
ALTER TABLE "CreditCard" DROP COLUMN "balance";

-- CreateIndex
CREATE INDEX "CreditCardBalance_creditCardId_idx" ON "CreditCardBalance"("creditCardId");

-- CreateIndex (unique constraint for card + currency)
CREATE UNIQUE INDEX "CreditCardBalance_creditCardId_currency_key" ON "CreditCardBalance"("creditCardId", "currency");

-- AddForeignKey
ALTER TABLE "CreditCardBalance" ADD CONSTRAINT "CreditCardBalance_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "CreditCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
