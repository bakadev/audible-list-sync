-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Title" (
    "asin" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "summary" TEXT,
    "image" TEXT,
    "runtimeLengthMin" INTEGER,
    "rating" TEXT,
    "releaseDate" TIMESTAMP(3),
    "publisherName" TEXT,
    "isbn" TEXT,
    "language" TEXT,
    "region" TEXT,
    "formatType" TEXT,
    "literatureType" TEXT,
    "copyright" INTEGER,
    "isAdult" BOOLEAN NOT NULL DEFAULT false,
    "seriesAsin" TEXT,
    "seriesPosition" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Title_pkey" PRIMARY KEY ("asin")
);

-- CreateTable
CREATE TABLE "Author" (
    "asin" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Author_pkey" PRIMARY KEY ("asin")
);

-- CreateTable
CREATE TABLE "AuthorOnTitle" (
    "authorAsin" TEXT NOT NULL,
    "titleAsin" TEXT NOT NULL,

    CONSTRAINT "AuthorOnTitle_pkey" PRIMARY KEY ("authorAsin","titleAsin")
);

-- CreateTable
CREATE TABLE "Narrator" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Narrator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NarratorOnTitle" (
    "narratorId" TEXT NOT NULL,
    "titleAsin" TEXT NOT NULL,

    CONSTRAINT "NarratorOnTitle_pkey" PRIMARY KEY ("narratorId","titleAsin")
);

-- CreateTable
CREATE TABLE "Genre" (
    "asin" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Genre_pkey" PRIMARY KEY ("asin")
);

-- CreateTable
CREATE TABLE "GenreOnTitle" (
    "genreAsin" TEXT NOT NULL,
    "titleAsin" TEXT NOT NULL,

    CONSTRAINT "GenreOnTitle_pkey" PRIMARY KEY ("genreAsin","titleAsin")
);

-- CreateTable
CREATE TABLE "Series" (
    "asin" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Series_pkey" PRIMARY KEY ("asin")
);

-- CreateTable
CREATE TABLE "LibraryEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "titleAsin" TEXT NOT NULL,
    "userRating" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "timeLeft" TEXT,
    "source" "LibrarySource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Title_title_idx" ON "Title"("title");

-- CreateIndex
CREATE INDEX "Title_seriesAsin_idx" ON "Title"("seriesAsin");

-- CreateIndex
CREATE INDEX "Author_name_idx" ON "Author"("name");

-- CreateIndex
CREATE INDEX "AuthorOnTitle_titleAsin_idx" ON "AuthorOnTitle"("titleAsin");

-- CreateIndex
CREATE INDEX "Narrator_name_idx" ON "Narrator"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Narrator_name_key" ON "Narrator"("name");

-- CreateIndex
CREATE INDEX "NarratorOnTitle_titleAsin_idx" ON "NarratorOnTitle"("titleAsin");

-- CreateIndex
CREATE INDEX "Genre_name_idx" ON "Genre"("name");

-- CreateIndex
CREATE INDEX "Genre_type_idx" ON "Genre"("type");

-- CreateIndex
CREATE INDEX "GenreOnTitle_titleAsin_idx" ON "GenreOnTitle"("titleAsin");

-- CreateIndex
CREATE INDEX "Series_name_idx" ON "Series"("name");

-- CreateIndex
CREATE INDEX "LibraryEntry_userId_idx" ON "LibraryEntry"("userId");

-- CreateIndex
CREATE INDEX "LibraryEntry_titleAsin_idx" ON "LibraryEntry"("titleAsin");

-- CreateIndex
CREATE INDEX "LibraryEntry_status_idx" ON "LibraryEntry"("status");

-- CreateIndex
CREATE INDEX "LibraryEntry_source_idx" ON "LibraryEntry"("source");

-- CreateIndex
CREATE UNIQUE INDEX "LibraryEntry_userId_titleAsin_key" ON "LibraryEntry"("userId", "titleAsin");

-- AddForeignKey
ALTER TABLE "Title" ADD CONSTRAINT "Title_seriesAsin_fkey" FOREIGN KEY ("seriesAsin") REFERENCES "Series"("asin") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorOnTitle" ADD CONSTRAINT "AuthorOnTitle_authorAsin_fkey" FOREIGN KEY ("authorAsin") REFERENCES "Author"("asin") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorOnTitle" ADD CONSTRAINT "AuthorOnTitle_titleAsin_fkey" FOREIGN KEY ("titleAsin") REFERENCES "Title"("asin") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NarratorOnTitle" ADD CONSTRAINT "NarratorOnTitle_narratorId_fkey" FOREIGN KEY ("narratorId") REFERENCES "Narrator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NarratorOnTitle" ADD CONSTRAINT "NarratorOnTitle_titleAsin_fkey" FOREIGN KEY ("titleAsin") REFERENCES "Title"("asin") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenreOnTitle" ADD CONSTRAINT "GenreOnTitle_genreAsin_fkey" FOREIGN KEY ("genreAsin") REFERENCES "Genre"("asin") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenreOnTitle" ADD CONSTRAINT "GenreOnTitle_titleAsin_fkey" FOREIGN KEY ("titleAsin") REFERENCES "Title"("asin") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryEntry" ADD CONSTRAINT "LibraryEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryEntry" ADD CONSTRAINT "LibraryEntry_titleAsin_fkey" FOREIGN KEY ("titleAsin") REFERENCES "Title"("asin") ON DELETE CASCADE ON UPDATE CASCADE;
