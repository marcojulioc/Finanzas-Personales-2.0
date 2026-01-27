-- Migration: Change CreditCard from dual currency (MXN/USD) to single currency model
-- This allows credit cards to use any of the 28 supported currencies

-- Step 1: Add new columns
ALTER TABLE "CreditCard" ADD COLUMN "currency" "Currency" NOT NULL DEFAULT 'USD';
ALTER TABLE "CreditCard" ADD COLUMN "creditLimit" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "CreditCard" ADD COLUMN "balance" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Step 2: Migrate data - use USD values if they exist, otherwise MXN
-- If limitUSD > 0, use USD; otherwise use MXN values
UPDATE "CreditCard"
SET
  "currency" = CASE
    WHEN "limitUSD" > 0 THEN 'USD'::"Currency"
    ELSE 'MXN'::"Currency"
  END,
  "creditLimit" = CASE
    WHEN "limitUSD" > 0 THEN "limitUSD"
    ELSE "limitMXN"
  END,
  "balance" = CASE
    WHEN "limitUSD" > 0 THEN "balanceUSD"
    ELSE "balanceMXN"
  END;

-- Step 3: Drop old columns
ALTER TABLE "CreditCard" DROP COLUMN "limitMXN";
ALTER TABLE "CreditCard" DROP COLUMN "limitUSD";
ALTER TABLE "CreditCard" DROP COLUMN "balanceMXN";
ALTER TABLE "CreditCard" DROP COLUMN "balanceUSD";
