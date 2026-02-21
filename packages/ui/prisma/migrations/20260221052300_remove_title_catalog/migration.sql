/*
  Warnings:

  - You are about to drop the `Author` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AuthorOnTitle` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Genre` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GenreOnTitle` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Narrator` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `NarratorOnTitle` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Series` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Title` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AuthorOnTitle" DROP CONSTRAINT "AuthorOnTitle_authorAsin_fkey";

-- DropForeignKey
ALTER TABLE "AuthorOnTitle" DROP CONSTRAINT "AuthorOnTitle_titleAsin_fkey";

-- DropForeignKey
ALTER TABLE "GenreOnTitle" DROP CONSTRAINT "GenreOnTitle_genreAsin_fkey";

-- DropForeignKey
ALTER TABLE "GenreOnTitle" DROP CONSTRAINT "GenreOnTitle_titleAsin_fkey";

-- DropForeignKey
ALTER TABLE "LibraryEntry" DROP CONSTRAINT "LibraryEntry_titleAsin_fkey";

-- DropForeignKey
ALTER TABLE "NarratorOnTitle" DROP CONSTRAINT "NarratorOnTitle_narratorId_fkey";

-- DropForeignKey
ALTER TABLE "NarratorOnTitle" DROP CONSTRAINT "NarratorOnTitle_titleAsin_fkey";

-- DropForeignKey
ALTER TABLE "Title" DROP CONSTRAINT "Title_seriesAsin_fkey";

-- DropTable
DROP TABLE "Author";

-- DropTable
DROP TABLE "AuthorOnTitle";

-- DropTable
DROP TABLE "Genre";

-- DropTable
DROP TABLE "GenreOnTitle";

-- DropTable
DROP TABLE "Narrator";

-- DropTable
DROP TABLE "NarratorOnTitle";

-- DropTable
DROP TABLE "Series";

-- DropTable
DROP TABLE "Title";
