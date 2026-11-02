ALTER TABLE "User"
ADD COLUMN "task_reminders" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "task_reminder_sent_on" DATE;
