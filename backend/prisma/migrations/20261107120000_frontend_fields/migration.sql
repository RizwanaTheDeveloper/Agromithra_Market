-- Fields required by the client: category-specific listing details and buyer requirement terms.
ALTER TABLE "Listing" ADD COLUMN "details" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "BuyerRequest" ADD COLUMN "budget" DECIMAL(14,2),
  ADD COLUMN "purpose" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "note" TEXT NOT NULL DEFAULT '';
