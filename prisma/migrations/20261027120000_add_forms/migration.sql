-- CreateTable
CREATE TABLE "Form" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "organisation_id" TEXT,
    "qr_code_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "draft_fields" JSONB NOT NULL DEFAULT '[]',
    "live_version" INTEGER,
    "closes_at" TIMESTAMP(3),
    "response_limit" INTEGER,
    "notify_emails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "thank_you" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Form_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormVersion" (
    "id" TEXT NOT NULL,
    "form_id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "fields" JSONB NOT NULL,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormResponse" (
    "id" TEXT NOT NULL,
    "form_id" TEXT NOT NULL,
    "version_id" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "device" TEXT,
    "country" TEXT,
    "ip_hash" TEXT,

    CONSTRAINT "FormResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Form_qr_code_id_key" ON "Form"("qr_code_id");

-- CreateIndex
CREATE UNIQUE INDEX "Form_slug_key" ON "Form"("slug");

-- CreateIndex
CREATE INDEX "Form_owner_id_idx" ON "Form"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "FormVersion_form_id_number_key" ON "FormVersion"("form_id", "number");

-- CreateIndex
CREATE INDEX "FormResponse_form_id_submitted_at_idx" ON "FormResponse"("form_id", "submitted_at");

-- AddForeignKey
ALTER TABLE "Form" ADD CONSTRAINT "Form_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Form" ADD CONSTRAINT "Form_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Form" ADD CONSTRAINT "Form_qr_code_id_fkey" FOREIGN KEY ("qr_code_id") REFERENCES "QrCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormVersion" ADD CONSTRAINT "FormVersion_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormResponse" ADD CONSTRAINT "FormResponse_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormResponse" ADD CONSTRAINT "FormResponse_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "FormVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

