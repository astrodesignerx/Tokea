-- AlterTable
ALTER TABLE "QrCode" ADD COLUMN     "background" TEXT NOT NULL DEFAULT 'white',
ADD COLUMN     "corner_colour" TEXT,
ADD COLUMN     "corner_style" TEXT NOT NULL DEFAULT 'square',
ADD COLUMN     "dot_style" TEXT NOT NULL DEFAULT 'square',
ADD COLUMN     "frame_text" TEXT;

