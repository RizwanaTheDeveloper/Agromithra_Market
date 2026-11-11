-- Media files now live on disk; the table keeps their location. Older rows keep their bytes until moved.
ALTER TABLE "ListingMedia" ALTER COLUMN "data" DROP NOT NULL;
ALTER TABLE "ListingMedia" ADD COLUMN "path" TEXT;
