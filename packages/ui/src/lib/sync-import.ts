/**
 * Shared Sync Import Processing Logic
 *
 * Extracted from /api/sync/import to be reusable by:
 * - Extension auto-sync (via /api/sync/import with token auth)
 * - Manual file upload (via /api/library/upload with session auth)
 *
 * Both flows perform the same core operation: full-replace import
 * of user's library with title metadata fetching from Audnex API.
 */

import prisma from "@/lib/prisma";
import { LibrarySource } from "@prisma/client";
import { fetchTitleMetadata } from "@/lib/audnex";

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
 * 2. For each title in payload:
 *    - Check if Title exists in catalog
 *    - If not, fetch metadata from Audnex API
 *    - Create/update Title and related entities (authors, narrators, genres, series)
 *    - Create LibraryEntry linking user to title
 *
 * @param userId - User ID to import library for
 * @param titles - Array of titles from extension or uploaded file
 * @returns Import statistics (imported count, new catalog entries, warnings)
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

  // Process each title
  let newToCatalog = 0;
  let imported = 0;
  let failed = 0;

  for (const extensionTitle of titles) {
    try {
      const asin = extensionTitle.asin;

      // Check if Title already exists in catalog
      let titleExists = await prisma.title.findUnique({
        where: { asin },
      });

      // Fetch from Audnex API if title doesn't exist
      let audnexData = null;
      if (!titleExists) {
        audnexData = await fetchTitleMetadata(asin);

        if (!audnexData) {
          warnings.push(`Failed to fetch metadata for ASIN ${asin}, skipping`);
          failed++;
          continue;
        }
      }

      // Create title and relationships in transaction
      await prisma.$transaction(async (tx) => {
        // Create Series first if it exists (to satisfy foreign key)
        if (audnexData && audnexData.seriesPrimary) {
          await tx.series.upsert({
            where: { asin: audnexData.seriesPrimary.asin },
            create: {
              asin: audnexData.seriesPrimary.asin,
              name: audnexData.seriesPrimary.name,
            },
            update: {
              name: audnexData.seriesPrimary.name,
            },
          });
        }

        // Upsert Title record from Audnex data
        if (audnexData) {
          await tx.title.upsert({
            where: { asin },
            create: {
              asin,
              title: audnexData.title,
              subtitle: audnexData.subtitle,
              description: audnexData.description,
              summary: audnexData.summary,
              image: audnexData.image,
              runtimeLengthMin: audnexData.runtimeLengthMin,
              rating: audnexData.rating,
              releaseDate: audnexData.releaseDate
                ? new Date(audnexData.releaseDate)
                : null,
              publisherName: audnexData.publisherName,
              isbn: audnexData.isbn,
              language: audnexData.language,
              region: audnexData.region,
              formatType: audnexData.formatType,
              literatureType: audnexData.literatureType,
              copyright: audnexData.copyright,
              isAdult: audnexData.isAdult ?? false,
              seriesAsin: audnexData.seriesPrimary?.asin,
              seriesPosition: audnexData.seriesPrimary?.position,
            },
            update: {
              title: audnexData.title,
              subtitle: audnexData.subtitle,
              description: audnexData.description,
              summary: audnexData.summary,
              image: audnexData.image,
              runtimeLengthMin: audnexData.runtimeLengthMin,
              rating: audnexData.rating,
              releaseDate: audnexData.releaseDate
                ? new Date(audnexData.releaseDate)
                : null,
              publisherName: audnexData.publisherName,
              isbn: audnexData.isbn,
              language: audnexData.language,
              region: audnexData.region,
              formatType: audnexData.formatType,
              literatureType: audnexData.literatureType,
              copyright: audnexData.copyright,
              isAdult: audnexData.isAdult ?? false,
              seriesAsin: audnexData.seriesPrimary?.asin,
              seriesPosition: audnexData.seriesPrimary?.position,
            },
          });

          if (!titleExists) {
            newToCatalog++;
          }

          // Upsert Authors and create AuthorOnTitle join records
          if (audnexData.authors && audnexData.authors.length > 0) {
            await tx.authorOnTitle.deleteMany({
              where: { titleAsin: asin },
            });

            for (const author of audnexData.authors) {
              const authorAsin = author.asin || `generated-${author.name.toLowerCase().replace(/\s+/g, '-')}`;

              await tx.author.upsert({
                where: { asin: authorAsin },
                create: {
                  asin: authorAsin,
                  name: author.name,
                },
                update: {
                  name: author.name,
                },
              });

              await tx.authorOnTitle.create({
                data: {
                  authorAsin,
                  titleAsin: asin,
                },
              });
            }
          }

          // Upsert Narrators and create NarratorOnTitle join records
          if (audnexData.narrators && audnexData.narrators.length > 0) {
            await tx.narratorOnTitle.deleteMany({
              where: { titleAsin: asin },
            });

            for (const narrator of audnexData.narrators) {
              const narratorRecord = await tx.narrator.upsert({
                where: { name: narrator.name },
                create: {
                  name: narrator.name,
                },
                update: {
                  name: narrator.name,
                },
              });

              await tx.narratorOnTitle.create({
                data: {
                  narratorId: narratorRecord.id,
                  titleAsin: asin,
                },
              });
            }
          }

          // Upsert Genres and link to Title
          if (audnexData.genres && audnexData.genres.length > 0) {
            await tx.genreOnTitle.deleteMany({
              where: { titleAsin: asin },
            });

            for (const genre of audnexData.genres) {
              await tx.genre.upsert({
                where: { asin: genre.asin },
                create: {
                  asin: genre.asin,
                  name: genre.name,
                  type: genre.type,
                },
                update: {
                  name: genre.name,
                  type: genre.type,
                },
              });

              await tx.genreOnTitle.create({
                data: {
                  genreAsin: genre.asin,
                  titleAsin: asin,
                },
              });
            }
          }
        }

        // Create LibraryEntry with user-specific data from extension
        await tx.libraryEntry.upsert({
          where: {
            userId_titleAsin: {
              userId,
              titleAsin: asin,
            },
          },
          create: {
            userId,
            titleAsin: asin,
            userRating: extensionTitle.personalRating || 0,
            status: extensionTitle.listeningProgress === 100 ? 'Finished' :
                    extensionTitle.listeningProgress && extensionTitle.listeningProgress > 0 ? 'In Progress' : 'Not Started',
            progress: extensionTitle.listeningProgress || 0,
            timeLeft: null,
            source: extensionTitle.source as LibrarySource,
          },
          update: {
            userRating: extensionTitle.personalRating || 0,
            status: extensionTitle.listeningProgress === 100 ? 'Finished' :
                    extensionTitle.listeningProgress && extensionTitle.listeningProgress > 0 ? 'In Progress' : 'Not Started',
            progress: extensionTitle.listeningProgress || 0,
            timeLeft: null,
            source: extensionTitle.source as LibrarySource,
          },
        });
      });

      imported++;
    } catch (error) {
      console.error(`Error processing title ${extensionTitle.asin}:`, error);
      warnings.push(`Failed to import ${extensionTitle.asin}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      failed++;
    }
  }

  // Count library vs wishlist
  const libraryCount = titles.filter((t) => t.source === "LIBRARY").length;
  const wishlistCount = titles.filter((t) => t.source === "WISHLIST").length;

  return {
    imported,
    newToCatalog,
    libraryCount,
    wishlistCount,
    warnings,
  };
}
