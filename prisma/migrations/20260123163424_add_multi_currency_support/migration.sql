-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Currency" ADD VALUE 'CAD';
ALTER TYPE "Currency" ADD VALUE 'DOP';
ALTER TYPE "Currency" ADD VALUE 'HTG';
ALTER TYPE "Currency" ADD VALUE 'JMD';
ALTER TYPE "Currency" ADD VALUE 'TTD';
ALTER TYPE "Currency" ADD VALUE 'BBD';
ALTER TYPE "Currency" ADD VALUE 'BSD';
ALTER TYPE "Currency" ADD VALUE 'CUP';
ALTER TYPE "Currency" ADD VALUE 'GTQ';
ALTER TYPE "Currency" ADD VALUE 'HNL';
ALTER TYPE "Currency" ADD VALUE 'NIO';
ALTER TYPE "Currency" ADD VALUE 'CRC';
ALTER TYPE "Currency" ADD VALUE 'PAB';
ALTER TYPE "Currency" ADD VALUE 'COP';
ALTER TYPE "Currency" ADD VALUE 'VES';
ALTER TYPE "Currency" ADD VALUE 'PEN';
ALTER TYPE "Currency" ADD VALUE 'CLP';
ALTER TYPE "Currency" ADD VALUE 'ARS';
ALTER TYPE "Currency" ADD VALUE 'BRL';
ALTER TYPE "Currency" ADD VALUE 'UYU';
ALTER TYPE "Currency" ADD VALUE 'PYG';
ALTER TYPE "Currency" ADD VALUE 'BOB';
ALTER TYPE "Currency" ADD VALUE 'EUR';
ALTER TYPE "Currency" ADD VALUE 'GBP';
ALTER TYPE "Currency" ADD VALUE 'CHF';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "currencies" "Currency"[] DEFAULT ARRAY['USD']::"Currency"[],
ADD COLUMN     "primaryCurrency" "Currency" NOT NULL DEFAULT 'USD';
