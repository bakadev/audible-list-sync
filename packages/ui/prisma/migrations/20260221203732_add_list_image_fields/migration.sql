-- CreateEnum
CREATE TYPE "ImageStatus" AS ENUM ('NONE', 'GENERATING', 'READY', 'FAILED');

-- AlterTable
ALTER TABLE "List" ADD COLUMN     "imageError" TEXT,
ADD COLUMN     "imageGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "imageOgKey" TEXT,
ADD COLUMN     "imageSquareKey" TEXT,
ADD COLUMN     "imageStatus" "ImageStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "imageTemplateId" TEXT,
ADD COLUMN     "imageVersion" INTEGER NOT NULL DEFAULT 0;
