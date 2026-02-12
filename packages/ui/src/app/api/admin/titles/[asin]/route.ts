/**
 * Admin Title Details and Update API
 *
 * GET /api/admin/titles/[asin] - Get specific title with usage stats
 * PUT /api/admin/titles/[asin] - Update title metadata
 * T117-T128: Title details and update endpoints
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requireAdmin } from '@/lib/admin-auth'
import prisma from '@/lib/prisma'

// T117: GET Title Details
export async function GET(
  req: NextRequest,
  { params }: { params: { asin: string } }
) {
  try {
    // T118: Authentication and admin role check
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    requireAdmin(user)

    const { asin } = params

    // T119: Fetch title by ASIN with 404 if not found
    // T120: Include all relations
    const title = await prisma.title.findUnique({
      where: { asin },
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
        libraryEntries: {
          select: {
            userId: true,
            source: true,
            status: true,
            userRating: true,
          },
        },
      },
    })

    if (!title) {
      return NextResponse.json({ error: 'Title not found' }, { status: 404 })
    }

    // T121: Calculate TitleUsageStats
    const totalUsers = title.libraryEntries.length
    const libraryCount = title.libraryEntries.filter(
      (e) => e.source === 'LIBRARY'
    ).length
    const wishlistCount = title.libraryEntries.filter(
      (e) => e.source === 'WISHLIST'
    ).length
    const finishedCount = title.libraryEntries.filter(
      (e) => e.status === 'Finished'
    ).length

    const ratingsWithValues = title.libraryEntries.filter((e) => e.userRating > 0)
    const averageRating =
      ratingsWithValues.length > 0
        ? ratingsWithValues.reduce((sum, e) => sum + e.userRating, 0) /
          ratingsWithValues.length
        : 0

    const usageStats = {
      totalUsers,
      libraryCount,
      wishlistCount,
      finishedCount,
      averageRating: Math.round(averageRating * 10) / 10,
    }

    // T122: Return TitleDetailsResponse
    return NextResponse.json({
      title: {
        asin: title.asin,
        title: title.title,
        subtitle: title.subtitle,
        description: title.description,
        summary: title.summary,
        image: title.image,
        runtimeLengthMin: title.runtimeLengthMin,
        rating: title.rating,
        releaseDate: title.releaseDate,
        publisherName: title.publisherName,
        isbn: title.isbn,
        language: title.language,
        region: title.region,
        formatType: title.formatType,
        literatureType: title.literatureType,
        copyright: title.copyright,
        isAdult: title.isAdult,
        seriesAsin: title.seriesAsin,
        seriesPosition: title.seriesPosition,
        authors: title.authors.map((a) => ({
          asin: a.author.asin,
          name: a.author.name,
        })),
        narrators: title.narrators.map((n) => ({
          name: n.narrator.name,
        })),
        genres: title.genres.map((g) => ({
          asin: g.genre.asin,
          name: g.genre.name,
          type: g.genre.type,
        })),
        series: title.series
          ? {
              asin: title.series.asin,
              name: title.series.name,
            }
          : null,
        createdAt: title.createdAt,
        updatedAt: title.updatedAt,
      },
      usageStats,
    })
  } catch (error) {
    console.error('Admin title details error:', error)

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

// T123: PUT Update Title
export async function PUT(
  req: NextRequest,
  { params }: { params: { asin: string } }
) {
  try {
    // T124: Authentication and admin role check
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    requireAdmin(user)

    const { asin } = params

    // T125: Validate request body
    const body = await req.json()

    // Verify title exists
    const existingTitle = await prisma.title.findUnique({
      where: { asin },
    })

    if (!existingTitle) {
      return NextResponse.json({ error: 'Title not found' }, { status: 404 })
    }

    // T126: Validate seriesAsin if provided
    if (body.seriesAsin) {
      const series = await prisma.series.findUnique({
        where: { asin: body.seriesAsin },
      })

      if (!series) {
        return NextResponse.json(
          { error: 'Series not found' },
          { status: 400 }
        )
      }
    }

    // T127: Update Title record (only provided fields)
    const updateData: any = {}

    const allowedFields = [
      'title',
      'subtitle',
      'description',
      'summary',
      'image',
      'runtimeLengthMin',
      'rating',
      'releaseDate',
      'publisherName',
      'isbn',
      'language',
      'region',
      'formatType',
      'literatureType',
      'copyright',
      'isAdult',
      'seriesAsin',
      'seriesPosition',
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] =
          field === 'releaseDate' && body[field]
            ? new Date(body[field])
            : body[field]
      }
    }

    await prisma.title.update({
      where: { asin },
      data: updateData,
    })

    // T128: Return updated TitleDetailsResponse
    // Fetch the updated title with all relations
    const updatedTitle = await prisma.title.findUnique({
      where: { asin },
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
        libraryEntries: {
          select: {
            userId: true,
            source: true,
            status: true,
            userRating: true,
          },
        },
      },
    })

    if (!updatedTitle) {
      throw new Error('Failed to fetch updated title')
    }

    // Calculate usage stats
    const totalUsers = updatedTitle.libraryEntries.length
    const libraryCount = updatedTitle.libraryEntries.filter(
      (e) => e.source === 'LIBRARY'
    ).length
    const wishlistCount = updatedTitle.libraryEntries.filter(
      (e) => e.source === 'WISHLIST'
    ).length
    const finishedCount = updatedTitle.libraryEntries.filter(
      (e) => e.status === 'Finished'
    ).length

    const ratingsWithValues = updatedTitle.libraryEntries.filter(
      (e) => e.userRating > 0
    )
    const averageRating =
      ratingsWithValues.length > 0
        ? ratingsWithValues.reduce((sum, e) => sum + e.userRating, 0) /
          ratingsWithValues.length
        : 0

    return NextResponse.json({
      title: {
        asin: updatedTitle.asin,
        title: updatedTitle.title,
        subtitle: updatedTitle.subtitle,
        description: updatedTitle.description,
        summary: updatedTitle.summary,
        image: updatedTitle.image,
        runtimeLengthMin: updatedTitle.runtimeLengthMin,
        rating: updatedTitle.rating,
        releaseDate: updatedTitle.releaseDate,
        publisherName: updatedTitle.publisherName,
        isbn: updatedTitle.isbn,
        language: updatedTitle.language,
        region: updatedTitle.region,
        formatType: updatedTitle.formatType,
        literatureType: updatedTitle.literatureType,
        copyright: updatedTitle.copyright,
        isAdult: updatedTitle.isAdult,
        seriesAsin: updatedTitle.seriesAsin,
        seriesPosition: updatedTitle.seriesPosition,
        authors: updatedTitle.authors.map((a) => ({
          asin: a.author.asin,
          name: a.author.name,
          position: a.position,
        })),
        narrators: updatedTitle.narrators.map((n) => ({
          name: n.narrator.name,
          position: n.position,
        })),
        genres: updatedTitle.genres.map((g) => ({
          asin: g.genre.asin,
          name: g.genre.name,
          type: g.genre.type,
        })),
        series: updatedTitle.series
          ? {
              asin: updatedTitle.series.asin,
              name: updatedTitle.series.name,
            }
          : null,
        createdAt: updatedTitle.createdAt,
        updatedAt: updatedTitle.updatedAt,
      },
      usageStats: {
        totalUsers,
        libraryCount,
        wishlistCount,
        finishedCount,
        averageRating: Math.round(averageRating * 10) / 10,
      },
    })
  } catch (error) {
    console.error('Admin title update error:', error)

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
