-- CreateEnum
CREATE TYPE "LibrarySource" AS ENUM ('LIBRARY', 'WISHLIST');

-- CreateEnum
CREATE TYPE "VisibilityLevel" AS ENUM ('PRIVATE', 'UNLISTED', 'PUBLIC');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "googleId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TitleCatalog" (
    "id" TEXT NOT NULL,
    "asin" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "authors" TEXT[],
    "narrators" TEXT[],
    "seriesName" TEXT,
    "seriesPosition" DOUBLE PRECISION,
    "duration" INTEGER,
    "coverImageUrl" TEXT,
    "summary" TEXT,
    "rating" DOUBLE PRECISION,
    "ratingCount" INTEGER,
    "publisher" TEXT,
    "releaseDate" TIMESTAMP(3),
    "language" TEXT,
    "categories" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TitleCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLibrary" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "titleId" TEXT NOT NULL,
    "source" "LibrarySource" NOT NULL,
    "listeningProgress" INTEGER NOT NULL DEFAULT 0,
    "personalRating" INTEGER,
    "dateAdded" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserLibrary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncToken" (
    "id" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL,
    "titlesImported" INTEGER NOT NULL,
    "newToCatalog" INTEGER NOT NULL,
    "libraryCount" INTEGER NOT NULL,
    "wishlistCount" INTEGER NOT NULL,
    "warnings" TEXT[],
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,

    CONSTRAINT "SyncHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "RecommendationList" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "visibility" "VisibilityLevel" NOT NULL DEFAULT 'PRIVATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecommendationList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListItem" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "userLibraryId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "note" TEXT,

    CONSTRAINT "ListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TierList" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "tierLabels" TEXT[],
    "visibility" "VisibilityLevel" NOT NULL DEFAULT 'PRIVATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TierList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TierAssignment" (
    "id" TEXT NOT NULL,
    "tierListId" TEXT NOT NULL,
    "userLibraryId" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "TierAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_googleId_idx" ON "User"("googleId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TitleCatalog_asin_key" ON "TitleCatalog"("asin");

-- CreateIndex
CREATE INDEX "TitleCatalog_asin_idx" ON "TitleCatalog"("asin");

-- CreateIndex
CREATE INDEX "UserLibrary_userId_idx" ON "UserLibrary"("userId");

-- CreateIndex
CREATE INDEX "UserLibrary_titleId_idx" ON "UserLibrary"("titleId");

-- CreateIndex
CREATE UNIQUE INDEX "UserLibrary_userId_titleId_key" ON "UserLibrary"("userId", "titleId");

-- CreateIndex
CREATE UNIQUE INDEX "SyncToken_jti_key" ON "SyncToken"("jti");

-- CreateIndex
CREATE INDEX "SyncToken_jti_idx" ON "SyncToken"("jti");

-- CreateIndex
CREATE INDEX "SyncToken_used_idx" ON "SyncToken"("used");

-- CreateIndex
CREATE INDEX "SyncToken_expiresAt_idx" ON "SyncToken"("expiresAt");

-- CreateIndex
CREATE INDEX "SyncHistory_userId_idx" ON "SyncHistory"("userId");

-- CreateIndex
CREATE INDEX "SyncHistory_syncedAt_idx" ON "SyncHistory"("syncedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_sessionToken_idx" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "ListItem_listId_userLibraryId_key" ON "ListItem"("listId", "userLibraryId");

-- CreateIndex
CREATE UNIQUE INDEX "ListItem_listId_position_key" ON "ListItem"("listId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "TierAssignment_tierListId_userLibraryId_key" ON "TierAssignment"("tierListId", "userLibraryId");

-- AddForeignKey
ALTER TABLE "UserLibrary" ADD CONSTRAINT "UserLibrary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLibrary" ADD CONSTRAINT "UserLibrary_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "TitleCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncToken" ADD CONSTRAINT "SyncToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncHistory" ADD CONSTRAINT "SyncHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationList" ADD CONSTRAINT "RecommendationList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListItem" ADD CONSTRAINT "ListItem_listId_fkey" FOREIGN KEY ("listId") REFERENCES "RecommendationList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListItem" ADD CONSTRAINT "ListItem_userLibraryId_fkey" FOREIGN KEY ("userLibraryId") REFERENCES "UserLibrary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TierList" ADD CONSTRAINT "TierList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TierAssignment" ADD CONSTRAINT "TierAssignment_tierListId_fkey" FOREIGN KEY ("tierListId") REFERENCES "TierList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TierAssignment" ADD CONSTRAINT "TierAssignment_userLibraryId_fkey" FOREIGN KEY ("userLibraryId") REFERENCES "UserLibrary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
