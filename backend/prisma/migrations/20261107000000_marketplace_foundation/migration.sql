-- CreateSchema
-- Initial migration for a new database; application validation is also enforced by core checks below.
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('crops', 'produce', 'cattle', 'smallstock', 'poultry', 'eggs', 'aqua', 'dairy');

-- CreateEnum
CREATE TYPE "Unit" AS ENUM ('quintal', 'kg', 'tonne', 'animal', 'bird', 'egg', 'tray30', 'litre', 'fish');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('draft', 'active', 'paused', 'sold', 'withdrawn');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "DealStage" AS ENUM ('quote', 'inspection', 'agreed', 'dispatched', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "PriceBasis" AS ENUM ('mandi', 'asking', 'completed', 'processor');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "displayName" TEXT,
    "city" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpChallenge" (
    "id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "digest" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerVerification" (
    "userId" UUID NOT NULL,
    "business" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'pending',
    "reviewNote" TEXT,
    "reviewedBy" UUID,
    "reviewedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuyerVerification_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "product" TEXT NOT NULL,
    "variety" TEXT NOT NULL,
    "grade" TEXT NOT NULL DEFAULT 'Unspecified',
    "unit" "Unit" NOT NULL,
    "price" DECIMAL(14,2) NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "minimumOrder" DECIMAL(14,3) NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "status" "ListingStatus" NOT NULL DEFAULT 'draft',
    "allowCall" BOOLEAN NOT NULL DEFAULT false,
    "allowWhatsapp" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerBlock" (
    "sellerId" UUID NOT NULL,
    "buyerId" UUID NOT NULL,

    CONSTRAINT "SellerBlock_pkey" PRIMARY KEY ("sellerId","buyerId")
);

-- CreateTable
CREATE TABLE "ContactEvent" (
    "id" UUID NOT NULL,
    "buyerId" UUID NOT NULL,
    "listingId" UUID NOT NULL,
    "channel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerRequest" (
    "id" UUID NOT NULL,
    "buyerId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unit" "Unit" NOT NULL,
    "city" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuyerRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" UUID NOT NULL,
    "listingId" UUID NOT NULL,
    "buyerId" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unit" "Unit" NOT NULL,
    "unitPrice" DECIMAL(14,2) NOT NULL,
    "stage" "DealStage" NOT NULL DEFAULT 'quote',
    "version" INTEGER NOT NULL DEFAULT 1,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealEvent" (
    "id" UUID NOT NULL,
    "dealId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "stage" "DealStage" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketObservation" (
    "id" UUID NOT NULL,
    "product" TEXT NOT NULL,
    "variety" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "unit" "Unit" NOT NULL,
    "state" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "reportedAt" DATE NOT NULL,
    "minimum" DECIMAL(14,2) NOT NULL,
    "modal" DECIMAL(14,2) NOT NULL,
    "maximum" DECIMAL(14,2) NOT NULL,
    "basis" "PriceBasis" NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "importedBy" UUID NOT NULL,
    "provenance" TEXT NOT NULL DEFAULT 'admin-imported-unverified',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketObservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "OtpChallenge_phone_createdAt_idx" ON "OtpChallenge"("phone", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Listing_status_category_createdAt_idx" ON "Listing"("status", "category", "createdAt");

-- CreateIndex
CREATE INDEX "Listing_sellerId_status_idx" ON "Listing"("sellerId", "status");

-- CreateIndex
CREATE INDEX "ContactEvent_listingId_createdAt_idx" ON "ContactEvent"("listingId", "createdAt");

-- CreateIndex
CREATE INDEX "BuyerRequest_closed_category_expiresAt_idx" ON "BuyerRequest"("closed", "category", "expiresAt");

-- CreateIndex
CREATE INDEX "Deal_sellerId_stage_idx" ON "Deal"("sellerId", "stage");

-- CreateIndex
CREATE INDEX "Deal_buyerId_stage_idx" ON "Deal"("buyerId", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "Deal_buyerId_idempotencyKey_key" ON "Deal"("buyerId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "MarketObservation_product_unit_basis_reportedAt_idx" ON "MarketObservation"("product", "unit", "basis", "reportedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MarketObservation_product_variety_grade_unit_market_reporte_key" ON "MarketObservation"("product", "variety", "grade", "unit", "market", "reportedAt", "basis", "sourceName");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerVerification" ADD CONSTRAINT "BuyerVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerBlock" ADD CONSTRAINT "SellerBlock_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerBlock" ADD CONSTRAINT "SellerBlock_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactEvent" ADD CONSTRAINT "ContactEvent_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactEvent" ADD CONSTRAINT "ContactEvent_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerRequest" ADD CONSTRAINT "BuyerRequest_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealEvent" ADD CONSTRAINT "DealEvent_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Core monetary and stock invariants also apply to direct database writes.
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_positive_values" CHECK ("price" > 0 AND "quantity" >= 0 AND "minimumOrder" > 0);
ALTER TABLE "BuyerRequest" ADD CONSTRAINT "BuyerRequest_positive_quantity" CHECK ("quantity" > 0);
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_positive_values" CHECK ("quantity" > 0 AND "unitPrice" > 0 AND "buyerId" <> "sellerId");
ALTER TABLE "MarketObservation" ADD CONSTRAINT "MarketObservation_price_bounds" CHECK ("minimum" >= 0 AND "modal" > 0 AND "minimum" <= "modal" AND "modal" <= "maximum");
ALTER TABLE "OtpChallenge" ADD CONSTRAINT "OtpChallenge_attempt_bounds" CHECK ("attempts" >= 0 AND "attempts" <= 5);
