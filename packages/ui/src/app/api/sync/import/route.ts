import { NextRequest, NextResponse } from "next/server";
import { verifySyncToken, extractBearerToken } from "@/lib/jwt";
import prisma from "@/lib/prisma";
import { LibrarySource } from "@prisma/client";
import { fetchTitleMetadata } from "@/lib/audnex";

// Maximum payload size: 50MB
const MAX_PAYLOAD_SIZE = 50 * 1024 * 1024;

// CORS headers for browser extension
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Allow all origins for development
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400", // 24 hours
};

interface ImportTitle {
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

interface ImportPayload {
  titles: ImportTitle[];
}

interface ImportResult {
  success: boolean;
  imported: number;
  newToCatalog: number;
  libraryCount: number;
  wishlistCount: number;
  warnings: string[];
}

// Handle preflight OPTIONS request
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// Helper to add CORS headers to responses
function jsonWithCors(data: any, options: { status?: number } = {}) {
  return NextResponse.json(data, {
    status: options.status,
    headers: corsHeaders,
  });
}

export async function POST(request: NextRequest) {
  try {
    // T031: JWT validation - extract token from Authorization header
    const authHeader = request.headers.get("authorization");
    const token = extractBearerToken(authHeader);

    if (!token) {
      return jsonWithCors(
        { error: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    // Verify JWT signature and expiry
    let payload;
    try {
      payload = verifySyncToken(token);
    } catch {
      return jsonWithCors({ error: "Invalid or expired token" }, { status: 401 });
    }

    const userId = payload.sub;
    const jti = payload.jti;

    // T032: Single-use token check
    const syncToken = await prisma.syncToken.findUnique({
      where: { jti },
    });

    if (!syncToken) {
      return jsonWithCors({ error: "Token not found" }, { status: 401 });
    }

    if (syncToken.used) {
      return jsonWithCors({ error: "Token already used" }, { status: 401 });
    }

    if (syncToken.userId !== userId) {
      return jsonWithCors({ error: "Token user mismatch" }, { status: 401 });
    }

    // T033: Payload validation
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_SIZE) {
      return jsonWithCors({ error: "Payload too large (max 50MB)" }, { status: 400 });
    }

    let body: ImportPayload;
    try {
      body = await request.json();
    } catch {
      return jsonWithCors({ error: "Invalid JSON payload" }, { status: 400 });
    }

    // Validate payload structure
    if (!body.titles || !Array.isArray(body.titles)) {
      return jsonWithCors({ error: "Missing or invalid titles array" }, { status: 400 });
    }

    // Validate each title has required fields
    const warnings: string[] = [];
    for (let i = 0; i < body.titles.length; i++) {
      const title = body.titles[i];
      if (!title.asin || typeof title.asin !== "string") {
        return jsonWithCors(
          { error: `Title at index ${i} missing required field: asin` },
          { status: 400 }
        );
      }
      if (!title.title || typeof title.title !== "string") {
        return jsonWithCors(
          { error: `Title at index ${i} missing required field: title` },
          { status: 400 }
        );
      }
      if (!Array.isArray(title.authors)) {
        return jsonWithCors(
          { error: `Title at index ${i} missing required field: authors (array)` },
          { status: 400 }
        );
      }
      if (!title.source || !["LIBRARY", "WISHLIST"].includes(title.source)) {
        return jsonWithCors(
          { error: `Title at index ${i} missing or invalid source (must be LIBRARY or WISHLIST)` },
          { status: 400 }
        );
      }
      if (!title.dateAdded) {
        return jsonWithCors(
          { error: `Title at index ${i} missing required field: dateAdded` },
          { status: 400 }
        );
      }
    }

    // Mark token as used immediately
    await prisma.syncToken.update({
      where: { jti },
      data: { used: true },
    });

    // T034: Full-replace strategy - delete existing user library
    await prisma.libraryEntry.deleteMany({
      where: { userId },
    });

    // T035-T037: Process each title
    let newToCatalog = 0;
    let imported = 0;
    let failed = 0;

    for (const extensionTitle of body.titles) {
      try {
        const asin = extensionTitle.asin;

        // Check if Title already exists
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
    const libraryCount = body.titles.filter((t) => t.source === "LIBRARY").length;
    const wishlistCount = body.titles.filter((t) => t.source === "WISHLIST").length;

    // T037: Log sync history
    await prisma.syncHistory.create({
      data: {
        userId,
        titlesImported: imported,
        newToCatalog,
        libraryCount,
        wishlistCount,
        warnings: warnings.length > 0 ? warnings : [],
        success: failed === 0,
        syncedAt: new Date(),
      },
    });

    const result = {
      imported,
      newToCatalog,
      libraryCount,
      wishlistCount,
    };

    // T038: Return success response
    return jsonWithCors({
      success: true,
      imported: result.imported,
      newToCatalog: result.newToCatalog,
      libraryCount: result.libraryCount,
      wishlistCount: result.wishlistCount,
      warnings,
    } as ImportResult);
  } catch (error) {
    // T039: Error handling
    console.error("Import error:", error);

    if (error instanceof Error) {
      // Check for specific error types
      if (error.message.includes("Payload") || error.message.includes("Invalid")) {
        return jsonWithCors({ error: error.message }, { status: 400 });
      }

      if (error.message.includes("Token") || error.message.includes("Unauthorized")) {
        return jsonWithCors({ error: error.message }, { status: 401 });
      }
    }

    // Generic server error
    return jsonWithCors({ error: "Internal server error during import" }, { status: 500 });
  }
}
