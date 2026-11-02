ALTER TABLE "Checklist"
  ADD COLUMN "repeat" TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN "repeat_weekday" INTEGER,
  ADD COLUMN "last_reset_on" DATE,
  ADD COLUMN "event_id" TEXT;

ALTER TABLE "ChecklistItem" ADD COLUMN "parent_id" TEXT;

CREATE UNIQUE INDEX "Checklist_event_id_key" ON "Checklist"("event_id");
CREATE INDEX "ChecklistItem_parent_id_idx" ON "ChecklistItem"("parent_id");

ALTER TABLE "Checklist" ADD CONSTRAINT "Checklist_event_id_fkey"
  FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "ChecklistItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
