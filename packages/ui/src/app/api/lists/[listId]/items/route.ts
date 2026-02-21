import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { fetchTitleMetadataBatch, AudnexTitle } from '@/lib/audnex';

function enrichItemsWithMetadata(
  items: any[],
  metadataMap: Map<string, AudnexTitle>
) {
  return items.map((item) => ({
    id: item.id,
    titleAsin: item.titleAsin,
    position: item.position,
    tier: item.tier,
    title: {
      asin: item.titleAsin,
      title: metadataMap.get(item.titleAsin)?.title || item.titleAsin,
      authors:
        metadataMap
          .get(item.titleAsin)
          ?.authors?.map((a: any) => a.name) || [],
      narrators:
        metadataMap
          .get(item.titleAsin)
          ?.narrators?.map((n: any) => n.name) || [],
      image: metadataMap.get(item.titleAsin)?.image || null,
      runtimeLengthMin:
        metadataMap.get(item.titleAsin)?.runtimeLengthMin || null,
    },
  }));
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { listId } = await params;

  const list = await prisma.list.findUnique({
    where: { id: listId },
    include: {
      items: true,
    },
  });

  if (!list) {
    return NextResponse.json({ error: 'List not found' }, { status: 404 });
  }

  if (list.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { items } = body as {
    items?: { titleAsin: string; position: number; tier?: string | null }[];
  };

  if (!items || !Array.isArray(items)) {
    return NextResponse.json(
      { error: 'items array is required' },
      { status: 400 }
    );
  }

  if (items.length > 100) {
    return NextResponse.json(
      { error: 'Maximum of 100 items per list' },
      { status: 400 }
    );
  }

  // Check for duplicate ASINs
  const asinSet = new Set<string>();
  for (const item of items) {
    if (!item.titleAsin) {
      return NextResponse.json(
        { error: 'Each item must have a titleAsin' },
        { status: 400 }
      );
    }
    if (asinSet.has(item.titleAsin)) {
      return NextResponse.json(
        { error: `Duplicate ASIN: ${item.titleAsin}` },
        { status: 400 }
      );
    }
    asinSet.add(item.titleAsin);
  }

  // Verify all ASINs exist in user's library
  const asins = Array.from(asinSet);
  const libraryEntries = await prisma.libraryEntry.findMany({
    where: {
      userId: session.user.id,
      titleAsin: { in: asins },
    },
    select: { titleAsin: true },
  });

  const ownedAsins = new Set(libraryEntries.map((e) => e.titleAsin));
  const missingAsins = asins.filter((asin) => !ownedAsins.has(asin));

  if (missingAsins.length > 0) {
    return NextResponse.json(
      {
        error: 'Some ASINs are not in your library',
        missing: missingAsins,
      },
      { status: 400 }
    );
  }

  // Validate tier assignments based on list type
  const listTiers = (list.tiers as string[] | null) || [];

  for (const item of items) {
    if (list.type === 'TIER') {
      if (!item.tier) {
        return NextResponse.json(
          {
            error: `Tier is required for TIER list items (ASIN: ${item.titleAsin})`,
          },
          { status: 400 }
        );
      }
      if (!listTiers.includes(item.tier)) {
        return NextResponse.json(
          {
            error: `Invalid tier "${item.tier}" for ASIN ${item.titleAsin}. Valid tiers: ${listTiers.join(', ')}`,
          },
          { status: 400 }
        );
      }
    } else {
      // RECOMMENDATION lists must not have tier
      if (item.tier) {
        return NextResponse.json(
          {
            error: `Tier must not be set for RECOMMENDATION list items (ASIN: ${item.titleAsin})`,
          },
          { status: 400 }
        );
      }
    }
  }

  // Replace all items in a transaction
  const updatedList = await prisma.$transaction(async (tx) => {
    await tx.listItem.deleteMany({
      where: { listId },
    });

    await tx.listItem.createMany({
      data: items.map((item) => ({
        listId,
        titleAsin: item.titleAsin,
        position: item.position,
        tier: item.tier || null,
      })),
    });

    return tx.list.findUnique({
      where: { id: listId },
      include: {
        items: {
          orderBy: { position: 'asc' },
        },
      },
    });
  });

  if (!updatedList) {
    return NextResponse.json({ error: 'List not found' }, { status: 404 });
  }

  // Enrich items with metadata
  const metadataResults = asins.length > 0
    ? await fetchTitleMetadataBatch(asins)
    : [];

  const metadataMap = new Map<string, AudnexTitle>();
  asins.forEach((asin, i) => {
    const meta = metadataResults[i];
    if (meta) metadataMap.set(asin, meta);
  });

  const enrichedItems = enrichItemsWithMetadata(
    updatedList.items,
    metadataMap
  );

  return NextResponse.json({
    id: updatedList.id,
    name: updatedList.name,
    description: updatedList.description,
    type: updatedList.type,
    tiers: updatedList.tiers,
    createdAt: updatedList.createdAt,
    updatedAt: updatedList.updatedAt,
    items: enrichedItems,
  });
}
