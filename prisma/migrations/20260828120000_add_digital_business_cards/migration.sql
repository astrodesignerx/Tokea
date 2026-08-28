-- CreateTable
CREATE TABLE "Organisation" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legal_name" TEXT NOT NULL,
    "website" TEXT,
    "website_label" TEXT,
    "logo_url" TEXT,
    "tagline" TEXT,
    "brand_primary" TEXT NOT NULL DEFAULT '#1DB8AF',
    "brand_secondary" TEXT NOT NULL DEFAULT '#87CFC8',
    "brand_accent" TEXT NOT NULL DEFAULT '#F1666B',
    "brand_ink" TEXT NOT NULL DEFAULT '#464F58',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Organisation_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "ContactCard" (
    "id" TEXT NOT NULL,
    "organisation_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "short_code" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone_mobile" TEXT,
    "phone_work" TEXT,
    "photo_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ContactCard_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "CardScan" (
    "id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "scanned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referrer" TEXT,
    "user_agent" TEXT,
    "country" TEXT,
    CONSTRAINT "CardScan_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE UNIQUE INDEX "Organisation_slug_key" ON "Organisation"("slug");
-- CreateIndex
CREATE INDEX "Organisation_owner_id_idx" ON "Organisation"("owner_id");
-- CreateIndex
CREATE UNIQUE INDEX "ContactCard_slug_key" ON "ContactCard"("slug");
-- CreateIndex
CREATE UNIQUE INDEX "ContactCard_short_code_key" ON "ContactCard"("short_code");
-- CreateIndex
CREATE INDEX "ContactCard_organisation_id_idx" ON "ContactCard"("organisation_id");
-- CreateIndex
CREATE INDEX "ContactCard_status_idx" ON "ContactCard"("status");
-- CreateIndex
CREATE INDEX "CardScan_card_id_scanned_at_idx" ON "CardScan"("card_id", "scanned_at");
-- AddForeignKey
ALTER TABLE "Organisation" ADD CONSTRAINT "Organisation_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "ContactCard" ADD CONSTRAINT "ContactCard_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "CardScan" ADD CONSTRAINT "CardScan_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "ContactCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
