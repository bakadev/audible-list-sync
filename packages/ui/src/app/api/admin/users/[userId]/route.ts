/**
 * Admin User Details API
 *
 * GET /api/admin/users/[userId] - Get specific user with full library data
 * - Requires admin authentication
 * - Includes full library with Title metadata
 * - Supports filtering by source (LIBRARY/WISHLIST)
 * - Supports filtering by status (Finished/In Progress/Not Started)
 * - Returns library summary with counts by source and status
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requireAdmin } from '@/lib/admin-auth'
import prisma from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // T074: Authentication and admin role check
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    requireAdmin(adminUser)

    const { userId } = await params

    // T075: Fetch user by userId with 404 if not found
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            libraryEntries: true,
          },
        },
        syncHistory: {
          take: 1,
          orderBy: {
            syncedAt: 'desc',
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Parse query parameters for filtering
    const searchParams = req.nextUrl.searchParams

    // T078: Source filter (LIBRARY/WISHLIST)
    const sourceFilter = searchParams.get('source')
    const sourceWhere = sourceFilter ? { source: sourceFilter } : {}

    // T079: Status filter (Finished/In Progress/Not Started)
    const statusFilter = searchParams.get('status')
    const statusWhere = statusFilter ? { status: statusFilter } : {}

    // T076: Fetch user's full library with LibraryEntry records
    // T077: Include Title metadata with authors, narrators, genres, series
    const library = await prisma.libraryEntry.findMany({
      where: {
        userId,
        ...sourceWhere,
        ...statusWhere,
      },
      include: {
        title: {
          include: {
            authors: {
              include: {
                author: true,
              },
            },
            narrators: {
              include: {
                narrator: true,
              },
            },
            genres: {
              include: {
                genre: true,
              },
            },
            series: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    // T080: Calculate LibrarySummary with counts by source and status
    const allEntries = await prisma.libraryEntry.findMany({
      where: { userId },
      select: {
        source: true,
        status: true,
      },
    })

    const summary = {
      total: allEntries.length,
      bySource: {
        LIBRARY: allEntries.filter((e) => e.source === 'LIBRARY').length,
        WISHLIST: allEntries.filter((e) => e.source === 'WISHLIST').length,
      },
      byStatus: {
        'Finished': allEntries.filter((e) => e.status === 'Finished').length,
        'In Progress': allEntries.filter((e) => e.status === 'In Progress').length,
        'Not Started': allEntries.filter((e) => e.status === 'Not Started').length,
      },
    }

    // Format library entries for response
    const formattedLibrary = library.map((entry) => ({
      id: entry.id,
      titleAsin: entry.titleAsin,
      userRating: entry.userRating,
      status: entry.status,
      progress: entry.progress,
      timeLeft: entry.timeLeft,
      source: entry.source,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      title: {
        asin: entry.title.asin,
        title: entry.title.title,
        subtitle: entry.title.subtitle,
        description: entry.title.description,
        summary: entry.title.summary,
        image: entry.title.image,
        runtimeLengthMin: entry.title.runtimeLengthMin,
        rating: entry.title.rating,
        releaseDate: entry.title.releaseDate,
        publisherName: entry.title.publisherName,
        authors: entry.title.authors.map((a) => ({
          asin: a.author.asin,
          name: a.author.name,
        })),
        narrators: entry.title.narrators.map((n) => ({
          name: n.narrator.name,
        })),
        genres: entry.title.genres.map((g) => ({
          asin: g.genre.asin,
          name: g.genre.name,
          type: g.genre.type,
        })),
        series: entry.title.series
          ? {
              asin: entry.title.series.asin,
              name: entry.title.series.name,
              position: entry.title.seriesPosition,
            }
          : null,
      },
    }))

    // T081: Return UserDetailsResponse with user, library, and summary
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
        libraryCount: user._count.libraryEntries,
        lastImportAt: user.syncHistory[0]?.syncedAt || null,
      },
      library: formattedLibrary,
      summary,
    })
  } catch (error) {
    console.error('Admin user details error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Return detailed error in development, generic in production
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    )
  }
}
