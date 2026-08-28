-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'KES',
ADD COLUMN     "deposit_amount" INTEGER,
ADD COLUMN     "payment_mode" TEXT NOT NULL DEFAULT 'free',
ADD COLUMN     "price_amount" INTEGER;
