-- Menu item photos (stored in the database, resized before upload)
ALTER TABLE "menu_items" ADD COLUMN "image" BYTEA,
ADD COLUMN "imageMime" TEXT,
ADD COLUMN "imageUpdatedAt" TIMESTAMP(3);
