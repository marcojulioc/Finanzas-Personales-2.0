-- Migration: Transform Budget.category (string) to Budget.categoryId (FK)
-- This migration handles existing data by linking budgets to their corresponding categories

-- Step 1: Add categoryId column as nullable first
ALTER TABLE "Budget" ADD COLUMN "categoryId" TEXT;

-- Step 2: Populate categoryId by matching category name with Category.name for the same user
-- This handles the data migration from string-based to relation-based
UPDATE "Budget" b
SET "categoryId" = c.id
FROM "Category" c
WHERE b."userId" = c."userId"
  AND b."category" = c."name";

-- Step 3: For budgets without matching categories, we need to create categories
-- First, insert missing categories (expense type by default since budgets are typically for expenses)
INSERT INTO "Category" ("id", "userId", "name", "icon", "color", "type", "isDefault", "isActive", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  b."userId",
  b."category",
  '📦',
  '#6B7280',
  'expense'::"TransactionType",
  false,
  true,
  NOW(),
  NOW()
FROM "Budget" b
WHERE b."categoryId" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Category" c
    WHERE c."userId" = b."userId" AND c."name" = b."category"
  )
GROUP BY b."userId", b."category";

-- Step 4: Update remaining budgets with newly created categories
UPDATE "Budget" b
SET "categoryId" = c.id
FROM "Category" c
WHERE b."categoryId" IS NULL
  AND b."userId" = c."userId"
  AND b."category" = c."name";

-- Step 5: Delete any budgets that still don't have a categoryId (edge cases)
DELETE FROM "Budget" WHERE "categoryId" IS NULL;

-- Step 6: Drop the old unique constraint
DROP INDEX IF EXISTS "Budget_userId_category_month_key";

-- Step 7: Make categoryId NOT NULL
ALTER TABLE "Budget" ALTER COLUMN "categoryId" SET NOT NULL;

-- Step 8: Add foreign key constraint
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 9: Create new unique constraint with categoryId
CREATE UNIQUE INDEX "Budget_userId_categoryId_month_key" ON "Budget"("userId", "categoryId", "month");

-- Step 10: Create index for categoryId
CREATE INDEX "Budget_categoryId_idx" ON "Budget"("categoryId");

-- Step 11: Drop the old category column
ALTER TABLE "Budget" DROP COLUMN "category";
