-- CreateTable
CREATE TABLE "Checklist" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Checklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "checklist_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'task',
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "position" DOUBLE PRECISION NOT NULL,
    "assignee_id" TEXT,
    "due_on" DATE,
    "done_at" TIMESTAMP(3),
    "done_by_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistMember" (
    "id" TEXT NOT NULL,
    "checklist_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistInvite" (
    "id" TEXT NOT NULL,
    "checklist_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "invited_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistActivity" (
    "id" TEXT NOT NULL,
    "checklist_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "item_title" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Checklist_owner_id_idx" ON "Checklist"("owner_id");

-- CreateIndex
CREATE INDEX "ChecklistItem_checklist_id_position_idx" ON "ChecklistItem"("checklist_id", "position");

-- CreateIndex
CREATE INDEX "ChecklistItem_assignee_id_done_at_idx" ON "ChecklistItem"("assignee_id", "done_at");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistMember_checklist_id_user_id_key" ON "ChecklistMember"("checklist_id", "user_id");

-- CreateIndex
CREATE INDEX "ChecklistMember_user_id_idx" ON "ChecklistMember"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistInvite_token_hash_key" ON "ChecklistInvite"("token_hash");

-- CreateIndex
CREATE INDEX "ChecklistInvite_checklist_id_idx" ON "ChecklistInvite"("checklist_id");

-- CreateIndex
CREATE INDEX "ChecklistActivity_checklist_id_created_at_idx" ON "ChecklistActivity"("checklist_id", "created_at");

-- AddForeignKey
ALTER TABLE "Checklist" ADD CONSTRAINT "Checklist_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_checklist_id_fkey" FOREIGN KEY ("checklist_id") REFERENCES "Checklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_done_by_id_fkey" FOREIGN KEY ("done_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistMember" ADD CONSTRAINT "ChecklistMember_checklist_id_fkey" FOREIGN KEY ("checklist_id") REFERENCES "Checklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistMember" ADD CONSTRAINT "ChecklistMember_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistInvite" ADD CONSTRAINT "ChecklistInvite_checklist_id_fkey" FOREIGN KEY ("checklist_id") REFERENCES "Checklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistInvite" ADD CONSTRAINT "ChecklistInvite_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistActivity" ADD CONSTRAINT "ChecklistActivity_checklist_id_fkey" FOREIGN KEY ("checklist_id") REFERENCES "Checklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistActivity" ADD CONSTRAINT "ChecklistActivity_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

