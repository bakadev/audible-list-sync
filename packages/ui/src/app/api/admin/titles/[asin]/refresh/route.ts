/**
 * Admin Refresh Title from Audnex API
 *
 * POST /api/admin/titles/[asin]/refresh - Fetch fresh metadata from Audnex
 * T129-T135: Refresh title with comparison and update
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requireAdmin } from '@/lib/admin-auth'
import prisma from '@/lib/prisma'
import { fetchTitleMetadata } from '@/lib/audnex'

export async function POST(
  req: NextRequest,
  { params }: { params: { asin: string } }
) {
  try {
    // T130: Authentication and admin role check
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    requireAdmin(user)

    const { asin } = params

    // Verify title exists
    const existingTitle = await prisma.title.findUnique({
      where: { asin },
    })

    if (!existingTitle) {
      return NextResponse.json({ error: 'Title not found' }, { status: 404 })
    }

    // T131: Fetch from Audnex API
    const audnexData = await fetchTitleMetadata(asin)

    // T132: Handle Audnex API errors
    if (!audnexData) {
      return NextResponse.json(
        { error: 'Failed to fetch data from Audnex API' },
        { status: 502 }
      )
    }

    // T133: Compare with existing to determine updatedFields
    const updatedFields: string[] = []

    const compareField = (
      fieldName: string,
      existingValue: any,
      newValue: any
    ) => {
      // Handle null/undefined equality
      if (existingValue == newValue) return

      // Handle date comparison
      if (existingValue instanceof Date && newValue) {
        const existingTime = existingValue.getTime()
        const newTime = new Date(newValue).getTime()
        if (existingTime !== newTime) {
          updatedFields.push(fieldName)
        }
        return
      }

      // Handle other types
      if (existingValue !== newValue) {
        updatedFields.push(fieldName)
      }
    }

    compareField('title', existingTitle.title, audnexData.title)
    compareField('subtitle', existingTitle.subtitle, audnexData.subtitle)
    compareField('description', existingTitle.description, audnexData.description)
    compareField('summary', existingTitle.summary, audnexData.summary)
    compareField('image', existingTitle.image, audnexData.image)
    compareField(
      'runtimeLengthMin',
      existingTitle.runtimeLengthMin,
      audnexData.runtimeLengthMin
    )
    compareField('rating', existingTitle.rating, audnexData.rating)
    compareField(
      'releaseDate',
      existingTitle.releaseDate,
      audnexData.releaseDate
    )
    compareField(
      'publisherName',
      existingTitle.publisherName,
      audnexData.publisherName
    )
    compareField('isbn', existingTitle.isbn, audnexData.isbn)
    compareField('language', existingTitle.language, audnexData.language)
    compareField('region', existingTitle.region, audnexData.region)
    compareField('formatType', existingTitle.formatType, audnexData.formatType)
    compareField(
      'literatureType',
      existingTitle.literatureType,
      audnexData.literatureType
    )
    compareField('copyright', existingTitle.copyright, audnexData.copyright)
    compareField('isAdult', existingTitle.isAdult, audnexData.isAdult)

    // T134: Update Title and relations in transaction
    await prisma.$transaction(async (tx) => {
      // Update Title record
      await tx.title.update({
        where: { asin },
        data: {
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

      // Update Series if exists
      if (audnexData.seriesPrimary) {
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

      // Update Authors
      if (audnexData.authors && audnexData.authors.length > 0) {
        await tx.authorOnTitle.deleteMany({
          where: { titleAsin: asin },
        })

        for (const [index, author] of audnexData.authors.entries()) {
          const authorAsin =
            author.asin ||
            `generated-${author.name.toLowerCase().replace(/\s+/g, '-')}`

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
              position: index,
            },
          })
        }
      }

      // Update Narrators
      if (audnexData.narrators && audnexData.narrators.length > 0) {
        await tx.narratorOnTitle.deleteMany({
          where: { titleAsin: asin },
        })

        for (const [index, narrator] of audnexData.narrators.entries()) {
          await tx.narrator.upsert({
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
              narratorName: narrator.name,
              titleAsin: asin,
              position: index,
            },
          })
        }
      }

      // Update Genres
      if (audnexData.genres && audnexData.genres.length > 0) {
        await tx.genreOnTitle.deleteMany({
          where: { titleAsin: asin },
        })

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
    })

    // T135: Return RefreshTitleResponse
    return NextResponse.json({
      success: true,
      message: 'Title refreshed successfully from Audnex API',
      updatedFields,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Admin title refresh error:', error)

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
