/**
 * Admin Titles API
 *
 * GET /api/admin/titles - List all titles with pagination, search, and sorting
 * DELETE /api/admin/titles - Drop all titles (dangerous operation)
 * T107-T116: Titles list with filtering and aggregations
 * T157-T163: Drop all titles functionality
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requireAdmin } from '@/lib/admin-auth'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    // T108: Authentication and admin role check
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    requireAdmin(user)

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams

    // T109: Pagination (default 50 per page)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    // T110: Search filtering by title, author name, narrator name
    const search = searchParams.get('search') || ''

    // T111: Genre filter
    const genreAsin = searchParams.get('genre')

    // T112: Series filter
    const seriesAsin = searchParams.get('series')

    // Build where clause
    const whereClause: any = {}

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' as const } },
        {
          authors: {
            some: {
              author: {
                name: { contains: search, mode: 'insensitive' as const },
              },
            },
          },
        },
        {
          narrators: {
            some: {
              narrator: {
                name: { contains: search, mode: 'insensitive' as const },
              },
            },
          },
        },
      ]
    }

    if (genreAsin) {
      whereClause.genres = {
        some: {
          genreAsin,
        },
      }
    }

    if (seriesAsin) {
      whereClause.seriesAsin = seriesAsin
    }

    // T113: Sorting
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'

    const validSortFields = [
      'title',
      'releaseDate',
      'rating',
      'createdAt',
    ]
    const orderByField = validSortFields.includes(sortBy) ? sortBy : 'createdAt'

    // Fetch titles with pagination and filters
    const [titles, totalCount] = await Promise.all([
      prisma.title.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { [orderByField]: sortOrder },
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
          _count: {
            select: {
              libraryEntries: true,
            },
          },
        },
      }),
      prisma.title.count({
        where: whereClause,
      }),
    ])

    // T114: Flatten author and narrator names into arrays
    // T115: Calculate userCount
    const titlesWithData = titles.map((t) => ({
      asin: t.asin,
      title: t.title,
      subtitle: t.subtitle,
      image: t.image,
      runtimeLengthMin: t.runtimeLengthMin,
      rating: t.rating,
      releaseDate: t.releaseDate,
      authors: t.authors.map((a) => a.author.name),
      narrators: t.narrators.map((n) => n.narrator.name),
      genres: t.genres.map((g) => ({
        asin: g.genre.asin,
        name: g.genre.name,
        type: g.genre.type,
      })),
      series: t.series
        ? {
            asin: t.series.asin,
            name: t.series.name,
            position: t.seriesPosition,
          }
        : null,
      userCount: t._count.libraryEntries,
      createdAt: t.createdAt,
    }))

    // T116: Return TitleListResponse
    return NextResponse.json({
      titles: titlesWithData,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    })
  } catch (error) {
    console.error('Admin titles list error:', error)

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

// T157: DELETE All Titles Handler
export async function DELETE(req: NextRequest) {
  try {
    // T158: Authentication and admin role check
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    requireAdmin(user)

    // T159: Validate confirmation query param
    // T163: Return 400 if confirmation missing or incorrect
    const searchParams = req.nextUrl.searchParams
    const confirmation = searchParams.get('confirm')

    if (confirmation !== 'DELETE_ALL_TITLES') {
      return NextResponse.json(
        {
          error:
            'Confirmation required. Add "?confirm=DELETE_ALL_TITLES" query parameter to proceed.',
        },
        { status: 400 }
      )
    }

    // T160: Count titles before deletion
    const titleCount = await prisma.title.count()

    // T161: Delete all Title records (cascades to join tables and library entries)
    await prisma.title.deleteMany()

    // T162: Return DropTitlesResponse with deletedCount
    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${titleCount} titles and all related data`,
      deletedCount: titleCount,
    })
  } catch (error) {
    console.error('Admin drop all titles error:', error)

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
