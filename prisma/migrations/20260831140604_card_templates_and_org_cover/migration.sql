-- AlterTable
ALTER TABLE "ContactCard" ADD COLUMN     "template" TEXT NOT NULL DEFAULT 'profile';

-- AlterTable
ALTER TABLE "Organisation" ADD COLUMN     "cover_image_url" TEXT;
