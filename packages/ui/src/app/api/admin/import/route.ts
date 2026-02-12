/**
 * Admin Import API Route
 *
 * Processes Chrome extension JSON export and imports library data
 * - Validates user authentication and admin role
 * - Fetches missing title metadata from Audnex API
 * - Creates/updates titles with normalized data (authors, narrators, genres, series)
 * - Creates user-specific library entries with progress tracking
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requireAdmin } from '@/lib/admin-auth'
import prisma from '@/lib/prisma'
import { fetchTitleMetadata } from '@/lib/audnex'

export async function POST(req: NextRequest) {
  try {
    // T031: Authentication check
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check admin role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    requireAdmin(user)

    // T032: Request body validation
    // T051: Handle invalid JSON schema
    let body
    try {
      body = await req.json()
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    if (!body.titleCatalog || !Array.isArray(body.titleCatalog)) {
      return NextResponse.json(
        { error: 'Invalid request: titleCatalog array is required' },
        { status: 400 }
      )
    }

    // T047: Track import start time for duration calculation
    const startTime = Date.now()

    // T033: Import summary tracking
    const summary = {
      totalCount: body.titleCatalog.length,
      successCount: 0,
      failureCount: 0,
      errors: [] as Array<{ asin: string; error: string }>,
    }

    // T034: Process each title from the extension's titleCatalog
    for (const extensionTitle of body.titleCatalog) {
      try {
        const asin = extensionTitle.asin

        if (!asin) {
          summary.failureCount++
          summary.errors.push({ asin: 'unknown', error: 'Missing ASIN' })
          continue
        }

        // T035: Check if Title exists in database
        let title = await prisma.title.findUnique({
          where: { asin },
        })

        // T036: Fetch from Audnex API if title not found
        let audnexData = null
        if (!title) {
          audnexData = await fetchTitleMetadata(asin)

          // T037: Handle Audnex API failures gracefully
          if (!audnexData) {
            console.warn(`Audnex API returned no data for ASIN ${asin}, skipping`)
            summary.failureCount++
            summary.errors.push({
              asin,
              error: 'Failed to fetch metadata from Audnex API',
            })
            continue
          }
        }

        // T045: Wrap database operations in transaction for atomicity
        await prisma.$transaction(async (tx) => {
          // T042: Upsert Series record FIRST if seriesPrimary exists (to satisfy foreign key constraint)
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
            })
          }

          // T038: Upsert Title record from Audnex data
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
            })

            // T039: Upsert Authors and create AuthorOnTitle join records
            if (audnexData.authors && audnexData.authors.length > 0) {
              // First, clear existing author relationships for this title
              await tx.authorOnTitle.deleteMany({
                where: { titleAsin: asin },
              })

              // Create/update authors and establish relationships
              for (const author of audnexData.authors) {
                const authorAsin = author.asin || `generated-${author.name.toLowerCase().replace(/\s+/g, '-')}`

                await tx.author.upsert({
                  where: { asin: authorAsin },
                  create: {
                    asin: authorAsin,
                    name: author.name,
                  },
                  update: {
                    name: author.name,
                  },
                })

                await tx.authorOnTitle.create({
                  data: {
                    authorAsin,
                    titleAsin: asin,
                  },
                })
              }
            }

            // T040: Upsert Narrators and create NarratorOnTitle join records
            if (audnexData.narrators && audnexData.narrators.length > 0) {
              // First, clear existing narrator relationships for this title
              await tx.narratorOnTitle.deleteMany({
                where: { titleAsin: asin },
              })

              // Create/update narrators and establish relationships
              for (const narrator of audnexData.narrators) {
                const narratorRecord = await tx.narrator.upsert({
                  where: { name: narrator.name },
                  create: {
                    name: narrator.name,
                  },
                  update: {
                    name: narrator.name,
                  },
                })

                await tx.narratorOnTitle.create({
                  data: {
                    narratorId: narratorRecord.id,
                    titleAsin: asin,
                  },
                })
              }
            }

            // T041: Upsert Genres and link to Title via implicit many-to-many
            if (audnexData.genres && audnexData.genres.length > 0) {
              // First, clear existing genre relationships for this title
              await tx.genreOnTitle.deleteMany({
                where: { titleAsin: asin },
              })

              // Create/update genres and establish relationships
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
                })

                await tx.genreOnTitle.create({
                  data: {
                    genreAsin: genre.asin,
                    titleAsin: asin,
                  },
                })
              }
            }
          }

          // T043: Create or update LibraryEntry with user-specific data
          // T044: Use unique constraint (userId, titleAsin) to prevent duplicates
          await tx.libraryEntry.upsert({
            where: {
              userId_titleAsin: {
                userId: session.user.id,
                titleAsin: asin,
              },
            },
            create: {
              userId: session.user.id,
              titleAsin: asin,
              userRating: extensionTitle.rating || 0,
              status: extensionTitle.status || 'Not Started',
              progress: extensionTitle.progress || 0,
              timeLeft: extensionTitle.timeLeft,
              source: 'LIBRARY',
            },
            update: {
              userRating: extensionTitle.rating || 0,
              status: extensionTitle.status || 'Not Started',
              progress: extensionTitle.progress || 0,
              timeLeft: extensionTitle.timeLeft,
              source: 'LIBRARY',
            },
          })
        })

        summary.successCount++
      } catch (error) {
        console.error(`Error processing title ${extensionTitle.asin}:`, error)
        summary.failureCount++
        summary.errors.push({
          asin: extensionTitle.asin || 'unknown',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // T047: Calculate import duration
    const durationMs = Date.now() - startTime

    // T048: Determine import status based on results
    let status: 'success' | 'partial' | 'failed'
    if (summary.failureCount === 0) {
      status = 'success'
    } else if (summary.successCount > 0) {
      status = 'partial'
    } else {
      status = 'failed'
    }

    // T046: Create SyncHistory record with summary stats
    // T049: Store errors array with ASIN and error details
    await prisma.syncHistory.create({
      data: {
        userId: session.user.id,
        syncedAt: new Date(),
        titlesImported: summary.successCount,
        newToCatalog: summary.successCount, // For manual import, all successful imports are new
        libraryCount: summary.successCount, // All imported titles go to library
        wishlistCount: 0,
        warnings: [],
        success: status === 'success',
        errorMessage: summary.errors.length > 0 ? JSON.stringify(summary.errors) : null,
      },
    })

    // Return success response with summary
    return NextResponse.json({
      message: 'Import completed',
      summary,
      status,
      durationMs,
    })
  } catch (error) {
    console.error('Import API error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
