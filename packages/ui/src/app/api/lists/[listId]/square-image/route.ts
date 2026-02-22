import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSignedImageUrl } from '@/lib/s3'

/**
 * GET /api/lists/[listId]/square-image
 *
 * Public endpoint for square image downloads.
 * 302 redirects to a presigned S3 URL.
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
      imageSquareKey: true,
    },
  })

  if (!list) {
    return NextResponse.json({ error: 'List not found' }, { status: 404 })
  }

  if (list.imageStatus !== 'READY' || !list.imageSquareKey) {
    return NextResponse.json(
      { error: 'No image available' },
      { status: 404 }
    )
  }

  try {
    const signedUrl = await getSignedImageUrl(list.imageSquareKey, 3600)

    return NextResponse.redirect(signedUrl, {
      status: 302,
      headers: {
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Failed to generate signed URL for square image:', error)
    return NextResponse.json(
      { error: 'Failed to serve image' },
      { status: 500 }
    )
  }
}
