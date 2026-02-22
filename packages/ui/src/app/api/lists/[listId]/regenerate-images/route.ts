import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { generateListImages } from '@/lib/image-generator/generateListImages'
import { uploadImage } from '@/lib/s3'
import { fetchTitleMetadataBatch } from '@/lib/audnex'

/** Cooldown between regeneration requests (30 seconds). */
const COOLDOWN_MS = 30_000

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { listId } = await params

  const list = await prisma.list.findUnique({
    where: { id: listId },
    include: {
      items: {
        orderBy: [{ tier: 'asc' }, { position: 'asc' }],
      },
      user: {
        select: { username: true, name: true },
      },
    },
  })

  if (!list) {
    return NextResponse.json({ error: 'List not found' }, { status: 404 })
  }

  if (list.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!list.imageTemplateId) {
    return NextResponse.json(
      { error: 'No template selected. Choose a template first.' },
      { status: 400 }
    )
  }

  // Enforce cooldown
  if (list.imageGeneratedAt) {
    const elapsed = Date.now() - list.imageGeneratedAt.getTime()
    if (elapsed < COOLDOWN_MS) {
      const retryAfter = Math.ceil((COOLDOWN_MS - elapsed) / 1000)
      return NextResponse.json(
        { error: 'Please wait before regenerating', retryAfter },
        { status: 429 }
      )
    }
  }

  // Increment version and set generating status
  const newVersion = list.imageVersion + 1
  await prisma.list.update({
    where: { id: listId },
    data: {
      imageVersion: newVersion,
      imageStatus: 'GENERATING',
      imageError: null,
    },
  })

  // Generate images (async but we await for this explicit endpoint)
  try {
    const asins = list.items.map((i) => i.titleAsin)
    const metadata =
      asins.length > 0 ? await fetchTitleMetadataBatch(asins) : []

    const books = list.items.map((item, idx) => ({
      asin: item.titleAsin,
      coverImageUrl: metadata[idx]?.image || null,
      title: metadata[idx]?.title || item.titleAsin,
      tier: item.tier,
    }))

    // Build tier labels for tier lists
    const tierLabels = list.type === 'TIER' && Array.isArray(list.tiers) && list.tiers.length > 0
      ? (list.tiers as string[])
      : undefined

    const images = await generateListImages({
      listId: list.id,
      title: list.name,
      description: list.description || undefined,
      username: list.user.username || list.user.name || 'Unknown',
      books,
      templateId: list.imageTemplateId,
      tierLabels,
    })

    const ogKey = `lists/${list.id}/v${newVersion}/og.png`
    const squareKey = `lists/${list.id}/v${newVersion}/square.png`

    await Promise.all([
      images.og ? uploadImage(ogKey, images.og.buffer) : Promise.resolve(),
      images.square
        ? uploadImage(squareKey, images.square.buffer)
        : Promise.resolve(),
    ])

    await prisma.list.update({
      where: { id: listId },
      data: {
        imageOgKey: images.og ? ogKey : null,
        imageSquareKey: images.square ? squareKey : null,
        imageStatus: 'READY',
        imageGeneratedAt: new Date(),
        imageError: null,
      },
    })

    return NextResponse.json({
      imageVersion: newVersion,
      imageStatus: 'READY',
    })
  } catch (error) {
    console.error(`Image regeneration failed for list ${listId}:`, error)

    await prisma.list.update({
      where: { id: listId },
      data: {
        imageStatus: 'FAILED',
        imageError:
          error instanceof Error ? error.message : 'Unknown error',
      },
    })

    return NextResponse.json(
      { error: 'Image generation failed' },
      { status: 500 }
    )
  }
}
