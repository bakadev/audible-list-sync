-- DropForeignKey
ALTER TABLE "ListItem" DROP CONSTRAINT "ListItem_userLibraryId_fkey";

-- DropForeignKey
ALTER TABLE "TierAssignment" DROP CONSTRAINT "TierAssignment_userLibraryId_fkey";

-- DropForeignKey
ALTER TABLE "UserLibrary" DROP CONSTRAINT "UserLibrary_titleId_fkey";

-- DropForeignKey
ALTER TABLE "UserLibrary" DROP CONSTRAINT "UserLibrary_userId_fkey";

-- DropTable
DROP TABLE "ListItem";

-- DropTable
DROP TABLE "RecommendationList";

-- DropTable
DROP TABLE "TierAssignment";

-- DropTable
DROP TABLE "TierList";

-- DropTable
DROP TABLE "TitleCatalog";

-- DropTable
DROP TABLE "UserLibrary";

-- DropEnum
DROP TYPE "VisibilityLevel";
