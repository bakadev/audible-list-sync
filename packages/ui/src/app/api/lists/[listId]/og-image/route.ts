import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSignedImageUrl } from '@/lib/s3'

/**
 * GET /api/lists/[listId]/og-image
 *
 * Public endpoint — social media crawlers must access it.
 * 302 redirects to a presigned S3 URL for the OG image.
 * Returns 404 if no image is available.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  const { listId } = await params

  const list = await prisma.list.findUnique({
    where: { id: listId },
    select: {
      imageStatus: true,
      imageOgKey: true,
    },
  })

  if (!list) {
    return NextResponse.json({ error: 'List not found' }, { status: 404 })
  }

  if (list.imageStatus !== 'READY' || !list.imageOgKey) {
    return NextResponse.json(
      { error: 'No image available' },
      { status: 404 }
    )
  }

  try {
    const signedUrl = await getSignedImageUrl(list.imageOgKey, 3600)

    return NextResponse.redirect(signedUrl, {
      status: 302,
      headers: {
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Failed to generate signed URL for OG image:', error)
    return NextResponse.json(
      { error: 'Failed to serve image' },
      { status: 500 }
    )
  }
}
