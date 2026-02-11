import { NextRequest, NextResponse } from 'next/server';
import { verifySyncToken, extractBearerToken } from '@/lib/jwt';
import prisma from '@/lib/prisma';
import { LibrarySource } from '@prisma/client';

// Maximum payload size: 50MB
const MAX_PAYLOAD_SIZE = 50 * 1024 * 1024;

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
  source: 'LIBRARY' | 'WISHLIST';
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

export async function POST(request: NextRequest) {
  try {
    // T031: JWT validation - extract token from Authorization header
    const authHeader = request.headers.get('authorization');
    const token = extractBearerToken(authHeader);

    if (!token) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 }
      );
    }

    // Verify JWT signature and expiry
    let payload;
    try {
      payload = verifySyncToken(token);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const userId = payload.sub;
    const jti = payload.jti;

    // T032: Single-use token check
    const syncToken = await prisma.syncToken.findUnique({
      where: { jti },
    });

    if (!syncToken) {
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 401 }
      );
    }

    if (syncToken.used) {
      return NextResponse.json(
        { error: 'Token already used' },
        { status: 401 }
      );
    }

    if (syncToken.userId !== userId) {
      return NextResponse.json(
        { error: 'Token user mismatch' },
        { status: 401 }
      );
    }

    // T033: Payload validation
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_SIZE) {
      return NextResponse.json(
        { error: 'Payload too large (max 50MB)' },
        { status: 400 }
      );
    }

    let body: ImportPayload;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // Validate payload structure
    if (!body.titles || !Array.isArray(body.titles)) {
      return NextResponse.json(
        { error: 'Missing or invalid titles array' },
        { status: 400 }
      );
    }

    // Validate each title has required fields
    const warnings: string[] = [];
    for (let i = 0; i < body.titles.length; i++) {
      const title = body.titles[i];
      if (!title.asin || typeof title.asin !== 'string') {
        return NextResponse.json(
          { error: `Title at index ${i} missing required field: asin` },
          { status: 400 }
        );
      }
      if (!title.title || typeof title.title !== 'string') {
        return NextResponse.json(
          { error: `Title at index ${i} missing required field: title` },
          { status: 400 }
        );
      }
      if (!Array.isArray(title.authors)) {
        return NextResponse.json(
          { error: `Title at index ${i} missing required field: authors (array)` },
          { status: 400 }
        );
      }
      if (!title.source || !['LIBRARY', 'WISHLIST'].includes(title.source)) {
        return NextResponse.json(
          { error: `Title at index ${i} missing or invalid source (must be LIBRARY or WISHLIST)` },
          { status: 400 }
        );
      }
      if (!title.dateAdded) {
        return NextResponse.json(
          { error: `Title at index ${i} missing required field: dateAdded` },
          { status: 400 }
        );
      }
    }

    // T034-T037: Import processing in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Mark token as used immediately
      await tx.syncToken.update({
        where: { jti },
        data: { used: true },
      });

      // T034: Full-replace strategy - delete existing user library
      await tx.userLibrary.deleteMany({
        where: { userId },
      });

      // T035: Process titles and upsert to catalog
      let newToCatalog = 0;

      const catalogUpserts = body.titles.map(async (title) => {
        // Check if title exists in catalog
        const existing = await tx.titleCatalog.findUnique({
          where: { asin: title.asin },
        });

        if (existing) {
          // Update existing title metadata
          return tx.titleCatalog.update({
            where: { asin: title.asin },
            data: {
              title: title.title,
              subtitle: title.subtitle,
              authors: title.authors,
              narrators: title.narrators || [],
              seriesName: title.seriesName,
              seriesPosition: title.seriesPosition,
              duration: title.duration,
              coverImageUrl: title.coverImageUrl,
              summary: title.summary,
              rating: title.rating,
              ratingCount: title.ratingCount,
              publisher: title.publisher,
              releaseDate: title.releaseDate ? new Date(title.releaseDate) : null,
              language: title.language,
              categories: title.categories || [],
            },
          });
        } else {
          // Insert new title
          newToCatalog++;
          return tx.titleCatalog.create({
            data: {
              asin: title.asin,
              title: title.title,
              subtitle: title.subtitle,
              authors: title.authors,
              narrators: title.narrators || [],
              seriesName: title.seriesName,
              seriesPosition: title.seriesPosition,
              duration: title.duration,
              coverImageUrl: title.coverImageUrl,
              summary: title.summary,
              rating: title.rating,
              ratingCount: title.ratingCount,
              publisher: title.publisher,
              releaseDate: title.releaseDate ? new Date(title.releaseDate) : null,
              language: title.language,
              categories: title.categories || [],
            },
          });
        }
      });

      // Wait for all catalog operations
      await Promise.all(catalogUpserts);

      // T036: Batch insert UserLibrary entries
      // First, get all titleIds from catalog
      const titleIds = await Promise.all(
        body.titles.map(async (title) => {
          const catalogEntry = await tx.titleCatalog.findUnique({
            where: { asin: title.asin },
            select: { id: true },
          });
          return { asin: title.asin, titleId: catalogEntry!.id };
        })
      );

      const titleIdMap = new Map(titleIds.map((t) => [t.asin, t.titleId]));

      // Create UserLibrary entries
      await tx.userLibrary.createMany({
        data: body.titles.map((title) => ({
          userId,
          titleId: titleIdMap.get(title.asin)!,
          source: title.source as LibrarySource,
          listeningProgress: title.listeningProgress || 0,
          personalRating: title.personalRating,
          dateAdded: new Date(title.dateAdded),
        })),
      });

      // Count library vs wishlist
      const libraryCount = body.titles.filter((t) => t.source === 'LIBRARY').length;
      const wishlistCount = body.titles.filter((t) => t.source === 'WISHLIST').length;

      // T037: Log sync history
      await tx.syncHistory.create({
        data: {
          userId,
          titlesImported: body.titles.length,
          newToCatalog,
          libraryCount,
          wishlistCount,
          warnings: warnings.length > 0 ? warnings : [],
          success: true,
          syncedAt: new Date(),
        },
      });

      return {
        imported: body.titles.length,
        newToCatalog,
        libraryCount,
        wishlistCount,
      };
    });

    // T038: Return success response
    return NextResponse.json({
      success: true,
      imported: result.imported,
      newToCatalog: result.newToCatalog,
      libraryCount: result.libraryCount,
      wishlistCount: result.wishlistCount,
      warnings,
    } as ImportResult);
  } catch (error) {
    // T039: Error handling
    console.error('Import error:', error);

    if (error instanceof Error) {
      // Check for specific error types
      if (error.message.includes('Payload') || error.message.includes('Invalid')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }

      if (error.message.includes('Token') || error.message.includes('Unauthorized')) {
        return NextResponse.json(
          { error: error.message },
          { status: 401 }
        );
      }
    }

    // Generic server error
    return NextResponse.json(
      { error: 'Internal server error during import' },
      { status: 500 }
    );
  }
}
