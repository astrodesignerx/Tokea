-- CreateTable
CREATE TABLE "TodoList" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "organisation_id" TEXT,
    "title" TEXT NOT NULL,
    "intro" TEXT,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "layout" TEXT NOT NULL DEFAULT 'list',
    "allow_view_switch" BOOLEAN NOT NULL DEFAULT false,
    "show_prices" BOOLEAN NOT NULL DEFAULT false,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "ask_event_date" BOOLEAN NOT NULL DEFAULT true,
    "notify_emails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "thank_you" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TodoList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TodoSection" (
    "id" TEXT NOT NULL,
    "list_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TodoSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TodoItem" (
    "id" TEXT NOT NULL,
    "list_id" TEXT NOT NULL,
    "section_id" TEXT,
    "name" TEXT NOT NULL,
    "note" TEXT,
    "image_url" TEXT,
    "price" INTEGER,
    "per_unit" BOOLEAN NOT NULL DEFAULT false,
    "unit_label" TEXT,
    "max_quantity" INTEGER NOT NULL DEFAULT 20,
    "position" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TodoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TodoRequest" (
    "id" TEXT NOT NULL,
    "list_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "event_date" DATE,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "estimate" INTEGER,
    "currency" TEXT NOT NULL,
    "seen_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TodoRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TodoRequestItem" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "item_id" TEXT,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" INTEGER,
    "line_total" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TodoRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TodoList_slug_key" ON "TodoList"("slug");

-- CreateIndex
CREATE INDEX "TodoList_owner_id_idx" ON "TodoList"("owner_id");

-- CreateIndex
CREATE INDEX "TodoSection_list_id_position_idx" ON "TodoSection"("list_id", "position");

-- CreateIndex
CREATE INDEX "TodoItem_list_id_position_idx" ON "TodoItem"("list_id", "position");

-- CreateIndex
CREATE INDEX "TodoRequest_list_id_status_created_at_idx" ON "TodoRequest"("list_id", "status", "created_at");

-- AddForeignKey
ALTER TABLE "TodoList" ADD CONSTRAINT "TodoList_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoList" ADD CONSTRAINT "TodoList_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoSection" ADD CONSTRAINT "TodoSection_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "TodoList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoItem" ADD CONSTRAINT "TodoItem_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "TodoList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoItem" ADD CONSTRAINT "TodoItem_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "TodoSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoRequest" ADD CONSTRAINT "TodoRequest_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "TodoList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoRequestItem" ADD CONSTRAINT "TodoRequestItem_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "TodoRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoRequestItem" ADD CONSTRAINT "TodoRequestItem_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "TodoItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
