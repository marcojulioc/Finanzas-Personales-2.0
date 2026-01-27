-- Add default balance records for credit cards that have no balances
-- This fixes cards that had creditLimit=0 and balance=0 before the multi-currency migration

INSERT INTO "CreditCardBalance" ("id", "creditCardId", "currency", "creditLimit", "balance", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    cc."id",
    'DOP',
    0,
    0,
    cc."createdAt",
    NOW()
FROM "CreditCard" cc
LEFT JOIN "CreditCardBalance" ccb ON cc."id" = ccb."creditCardId"
WHERE ccb."id" IS NULL;
