-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "short_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "is_live" BOOLEAN NOT NULL DEFAULT true,
    "show_badge" BOOLEAN NOT NULL DEFAULT true,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "last_viewed_at" TIMESTAMP(3),
    "current_file_id" TEXT,
    "blocked_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageFile" (
    "id" TEXT NOT NULL,
    "page_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),

    CONSTRAINT "PageFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Page_short_code_key" ON "Page"("short_code");

-- CreateIndex
CREATE UNIQUE INDEX "Page_current_file_id_key" ON "Page"("current_file_id");

-- CreateIndex
CREATE INDEX "Page_owner_id_deleted_at_idx" ON "Page"("owner_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "PageFile_key_key" ON "PageFile"("key");

-- CreateIndex
CREATE INDEX "PageFile_page_id_idx" ON "PageFile"("page_id");

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_current_file_id_fkey" FOREIGN KEY ("current_file_id") REFERENCES "PageFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageFile" ADD CONSTRAINT "PageFile_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
