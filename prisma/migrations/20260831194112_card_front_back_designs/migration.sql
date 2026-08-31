-- AlterTable
ALTER TABLE "ContactCard" ADD COLUMN     "card_back_url" TEXT,
ADD COLUMN     "card_front_url" TEXT;

-- Wire the printed-card designs (converted from the client's PDFs by
-- scripts/convert-card-designs.ps1) onto the five existing cards.
UPDATE "ContactCard" SET "card_front_url" = '/cards/kariuki-njoroge-front.png', "card_back_url" = '/cards/kariuki-njoroge-back.png' WHERE "slug" = 'kariuki-njoroge';
UPDATE "ContactCard" SET "card_front_url" = '/cards/mathieu-dalle-front.png', "card_back_url" = '/cards/mathieu-dalle-back.png' WHERE "slug" = 'mathieu-dalle';
UPDATE "ContactCard" SET "card_front_url" = '/cards/matia-mandela-front.png', "card_back_url" = '/cards/matia-mandela-back.png' WHERE "slug" = 'matia-mandela';
UPDATE "ContactCard" SET "card_front_url" = '/cards/mercy-rose-front.png', "card_back_url" = '/cards/mercy-rose-back.png' WHERE "slug" = 'mercy-rose';
UPDATE "ContactCard" SET "card_front_url" = '/cards/pancras-odhiambo-front.png', "card_back_url" = '/cards/pancras-odhiambo-back.png' WHERE "slug" = 'pancras-odhiambo';
