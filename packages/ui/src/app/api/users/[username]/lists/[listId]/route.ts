import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { fetchTitleMetadataBatch, AudnexTitle } from '@/lib/audnex';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string; listId: string }> }
) {
  try {
    const { username, listId } = await params;

    if (!username || !listId) {
      return NextResponse.json(
        { error: 'Username and list ID are required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        name: true,
        image: true,
      },
    });

    if (!user || !user.username) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const list = await prisma.list.findUnique({
      where: { id: listId },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        tiers: true,
        userId: true,
        imageStatus: true,
        imageOgKey: true,
        imageSquareKey: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!list || list.userId !== user.id) {
      return NextResponse.json(
        { error: 'List not found' },
        { status: 404 }
      );
    }

    const items = await prisma.listItem.findMany({
      where: { listId: list.id },
      select: {
        id: true,
        titleAsin: true,
        position: true,
        tier: true,
      },
      orderBy: [
        { tier: 'asc' },
        { position: 'asc' },
      ],
    });

    const asins = items
      .map((item) => item.titleAsin)
      .filter((asin): asin is string => asin != null);

    let metadataMap = new Map<string, AudnexTitle>();

    if (asins.length > 0) {
      const metadataResults = await fetchTitleMetadataBatch(asins);
      asins.forEach((asin, i) => {
        const meta = metadataResults[i];
        if (meta) metadataMap.set(asin, meta);
      });
    }

    const itemsWithMetadata = items.map((item) => {
      const titleMetadata = item.titleAsin
        ? metadataMap.get(item.titleAsin)
        : null;

      return {
        id: item.id,
        titleAsin: item.titleAsin,
        position: item.position,
        tier: item.tier,
        title: titleMetadata
          ? {
              asin: titleMetadata.asin,
              title: titleMetadata.title,
              authors: titleMetadata.authors,
              narrators: titleMetadata.narrators,
              image: titleMetadata.image,
              runtimeLengthMin: titleMetadata.runtimeLengthMin,
            }
          : null,
      };
    });

    // Public responses use proxy route URLs (not presigned URLs) so they stay stable
    const imageOgUrl =
      list.imageStatus === 'READY' && list.imageOgKey
        ? `/api/lists/${list.id}/og-image`
        : null
    const imageSquareUrl =
      list.imageStatus === 'READY' && list.imageSquareKey
        ? `/api/lists/${list.id}/square-image`
        : null

    return NextResponse.json({
      user: {
        username: user.username,
        name: user.name,
        image: user.image,
      },
      id: list.id,
      name: list.name,
      description: list.description,
      type: list.type,
      tiers: list.tiers,
      imageStatus: list.imageStatus,
      imageOgUrl,
      imageSquareUrl,
      items: itemsWithMetadata,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
    });
  } catch (error) {
    console.error('Error fetching list details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
