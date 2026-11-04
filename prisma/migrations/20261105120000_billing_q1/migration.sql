-- CreateTable
CREATE TABLE "BillingProfile" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "business_name" TEXT NOT NULL,
    "logo_url" TEXT,
    "brand_primary" TEXT NOT NULL DEFAULT '#111111',
    "brand_accent" TEXT NOT NULL DEFAULT '#f7ad19',
    "font" TEXT NOT NULL DEFAULT 'poppins',
    "footer_text" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "social_handle" TEXT,
    "address" TEXT,
    "bank_name" TEXT,
    "bank_account_name" TEXT,
    "bank_account_number" TEXT,
    "bank_branch" TEXT,
    "mpesa_type" TEXT,
    "mpesa_number" TEXT,
    "mpesa_account" TEXT,
    "mpesa_name" TEXT,
    "vat_registered" BOOLEAN NOT NULL DEFAULT false,
    "vat_rate_bp" INTEGER NOT NULL DEFAULT 1600,
    "kra_pin" TEXT,
    "etims_enabled" BOOLEAN NOT NULL DEFAULT false,
    "default_currency" TEXT NOT NULL DEFAULT 'KES',
    "default_payment_terms" TEXT,
    "default_terms" TEXT,
    "default_quote_validity_days" INTEGER NOT NULL DEFAULT 14,
    "default_invoice_due_days" INTEGER NOT NULL DEFAULT 7,
    "default_template" TEXT NOT NULL DEFAULT 'classic',
    "private_template" TEXT,
    "invoice_prefix" TEXT NOT NULL DEFAULT 'INV-',
    "quote_prefix" TEXT NOT NULL DEFAULT 'QUO-',
    "receipt_prefix" TEXT NOT NULL DEFAULT 'RCT-',
    "next_invoice_number" INTEGER NOT NULL DEFAULT 1,
    "next_quote_number" INTEGER NOT NULL DEFAULT 1,
    "next_receipt_number" INTEGER NOT NULL DEFAULT 1,
    "letterhead_upload_id" TEXT,
    "letterhead_box_x" DOUBLE PRECISION,
    "letterhead_box_y" DOUBLE PRECISION,
    "letterhead_box_w" DOUBLE PRECISION,
    "letterhead_box_h" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "kra_pin" TEXT,
    "notes" TEXT,
    "organisation_id" TEXT,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingDocument" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "bill_to_name" TEXT NOT NULL,
    "bill_to_company" TEXT,
    "bill_to_email" TEXT,
    "bill_to_phone" TEXT,
    "bill_to_address" TEXT,
    "bill_to_kra_pin" TEXT,
    "type" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "title" TEXT,
    "issue_date" DATE NOT NULL,
    "due_date" DATE,
    "valid_until" DATE,
    "currency" TEXT NOT NULL,
    "vat_mode" TEXT NOT NULL,
    "vat_rate_bp" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "vat_amount" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "amount_paid" INTEGER NOT NULL DEFAULT 0,
    "payment_terms" TEXT,
    "notes" TEXT,
    "terms" TEXT,
    "template" TEXT NOT NULL,
    "share_token" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3),
    "accepted_at" TIMESTAMP(3),
    "declined_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "voided_at" TIMESTAMP(3),
    "source_quote_id" TEXT,
    "invoice_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingDocumentItem" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "section" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "quantity_milli" INTEGER NOT NULL,
    "unit_price" INTEGER NOT NULL,
    "line_total" INTEGER NOT NULL,
    "etims_item_code" TEXT,
    "etims_tax_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingDocumentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentPayment" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "provider_txn_id" TEXT,
    "paid_at" TIMESTAMP(3),
    "note" TEXT,
    "receipt_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BillingProfile_user_id_key" ON "BillingProfile"("user_id");

-- CreateIndex
CREATE INDEX "Customer_owner_id_idx" ON "Customer"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "BillingDocument_share_token_key" ON "BillingDocument"("share_token");

-- CreateIndex
CREATE INDEX "BillingDocument_owner_id_type_status_idx" ON "BillingDocument"("owner_id", "type", "status");

-- CreateIndex
CREATE INDEX "BillingDocument_customer_id_idx" ON "BillingDocument"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "BillingDocument_owner_id_type_number_key" ON "BillingDocument"("owner_id", "type", "number");

-- CreateIndex
CREATE INDEX "BillingDocumentItem_document_id_position_idx" ON "BillingDocumentItem"("document_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentPayment_reference_key" ON "DocumentPayment"("reference");

-- CreateIndex
CREATE INDEX "DocumentPayment_document_id_idx" ON "DocumentPayment"("document_id");

-- AddForeignKey
ALTER TABLE "BillingProfile" ADD CONSTRAINT "BillingProfile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingDocument" ADD CONSTRAINT "BillingDocument_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingDocument" ADD CONSTRAINT "BillingDocument_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingDocument" ADD CONSTRAINT "BillingDocument_source_quote_id_fkey" FOREIGN KEY ("source_quote_id") REFERENCES "BillingDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingDocument" ADD CONSTRAINT "BillingDocument_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "BillingDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingDocumentItem" ADD CONSTRAINT "BillingDocumentItem_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "BillingDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentPayment" ADD CONSTRAINT "DocumentPayment_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "BillingDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentPayment" ADD CONSTRAINT "DocumentPayment_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "BillingDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
