-- AlterTable
ALTER TABLE "User"
ADD COLUMN "job_title" TEXT,
ADD COLUMN "phone" TEXT,
ADD COLUMN "bio" TEXT,
ADD COLUMN "default_organisation_id" TEXT;

-- CreateIndex
CREATE INDEX "User_default_organisation_id_idx" ON "User"("default_organisation_id");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_default_organisation_id_fkey" FOREIGN KEY ("default_organisation_id") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
