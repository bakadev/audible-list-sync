/**
 * Shared Sync Import Processing Logic
 *
 * Stores only user-specific data (ASIN references, progress, ratings).
 * Book metadata is served on demand by the Audnexus API.
 */

import prisma from "@/lib/prisma";
import { LibrarySource } from "@prisma/client";

export interface ImportTitle {
  asin: string;
  title: string;
  subtitle?: string | null;
  authors: string[];
  narrators: string[];
  seriesName?: string | null;
  seriesPosition?: number | null;
  duration?: number | null;
  coverImageUrl?: string | null;
  summary?: string | null;
  rating?: number | null;
  ratingCount?: number | null;
  publisher?: string | null;
  releaseDate?: string | null;
  language?: string | null;
  categories?: string[];
  source: "LIBRARY" | "WISHLIST";
  listeningProgress?: number;
  personalRating?: number | null;
  dateAdded: string;
}

export interface SyncImportResult {
  imported: number;
  newToCatalog: number;
  libraryCount: number;
  wishlistCount: number;
  warnings: string[];
}

/**
 * Process library import for a user
 *
 * Full-replace strategy:
 * 1. Delete all existing LibraryEntry records for user
 * 2. Create new LibraryEntry for each title with user-specific data
 *
 * Book metadata is NOT stored — Audnexus API serves it on demand.
 */
export async function processSyncImport(
  userId: string,
  titles: ImportTitle[]
): Promise<SyncImportResult> {
  const warnings: string[] = [];

  // Full-replace strategy - delete existing user library
  await prisma.libraryEntry.deleteMany({
    where: { userId },
  });

  let imported = 0;

  for (const extensionTitle of titles) {
    try {
      await prisma.libraryEntry.upsert({
        where: {
          userId_titleAsin: {
            userId,
            titleAsin: extensionTitle.asin,
          },
        },
        create: {
          userId,
          titleAsin: extensionTitle.asin,
          userRating: extensionTitle.personalRating || 0,
          status:
            extensionTitle.listeningProgress === 100
              ? "Finished"
              : extensionTitle.listeningProgress &&
                  extensionTitle.listeningProgress > 0
                ? "In Progress"
                : "Not Started",
          progress: extensionTitle.listeningProgress || 0,
          timeLeft: null,
          source: extensionTitle.source as LibrarySource,
        },
        update: {
          userRating: extensionTitle.personalRating || 0,
          status:
            extensionTitle.listeningProgress === 100
              ? "Finished"
              : extensionTitle.listeningProgress &&
                  extensionTitle.listeningProgress > 0
                ? "In Progress"
                : "Not Started",
          progress: extensionTitle.listeningProgress || 0,
          timeLeft: null,
          source: extensionTitle.source as LibrarySource,
        },
      });

      imported++;
    } catch (error) {
      console.error(`Error processing title ${extensionTitle.asin}:`, error);
      warnings.push(
        `Failed to import ${extensionTitle.asin}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  const libraryCount = titles.filter((t) => t.source === "LIBRARY").length;
  const wishlistCount = titles.filter((t) => t.source === "WISHLIST").length;

  return {
    imported,
    newToCatalog: 0,
    libraryCount,
    wishlistCount,
    warnings,
  };
}
