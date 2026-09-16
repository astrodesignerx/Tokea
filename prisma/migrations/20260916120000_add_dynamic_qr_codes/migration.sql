-- CreateTable
CREATE TABLE "QrCode" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "short_code" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "ios_destination" TEXT,
    "android_destination" TEXT,
    "expires_at" TIMESTAMP(3),
    "expired_destination" TEXT,
    "password_hash" TEXT,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "colour" TEXT NOT NULL DEFAULT '#464F58',
    "logo_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QrCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QrScan" (
    "id" TEXT NOT NULL,
    "qr_code_id" TEXT NOT NULL,
    "scanned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referrer" TEXT,
    "user_agent" TEXT,
    "country" TEXT,
    "device" TEXT,

    CONSTRAINT "QrScan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QrLinkChange" (
    "id" TEXT NOT NULL,
    "qr_code_id" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QrLinkChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QrScheduledChange" (
    "id" TEXT NOT NULL,
    "qr_code_id" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "run_at" TIMESTAMP(3) NOT NULL,
    "applied_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QrScheduledChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QrCode_short_code_key" ON "QrCode"("short_code");

-- CreateIndex
CREATE INDEX "QrCode_owner_id_idx" ON "QrCode"("owner_id");

-- CreateIndex
CREATE INDEX "QrCode_status_idx" ON "QrCode"("status");

-- CreateIndex
CREATE INDEX "QrScan_qr_code_id_scanned_at_idx" ON "QrScan"("qr_code_id", "scanned_at");

-- CreateIndex
CREATE INDEX "QrLinkChange_qr_code_id_changed_at_idx" ON "QrLinkChange"("qr_code_id", "changed_at");

-- CreateIndex
CREATE INDEX "QrScheduledChange_qr_code_id_applied_at_run_at_idx" ON "QrScheduledChange"("qr_code_id", "applied_at", "run_at");

-- AddForeignKey
ALTER TABLE "QrCode" ADD CONSTRAINT "QrCode_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QrScan" ADD CONSTRAINT "QrScan_qr_code_id_fkey" FOREIGN KEY ("qr_code_id") REFERENCES "QrCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QrLinkChange" ADD CONSTRAINT "QrLinkChange_qr_code_id_fkey" FOREIGN KEY ("qr_code_id") REFERENCES "QrCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QrScheduledChange" ADD CONSTRAINT "QrScheduledChange_qr_code_id_fkey" FOREIGN KEY ("qr_code_id") REFERENCES "QrCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

