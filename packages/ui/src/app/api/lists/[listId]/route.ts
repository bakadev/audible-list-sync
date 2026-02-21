import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { fetchTitleMetadataBatch, AudnexTitle } from '@/lib/audnex';
import {
  validateListName,
  validateListDescription,
  validateTiers,
} from '@/lib/list-validation';

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

export async function GET(
  _request: NextRequest,
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
      items: {
        orderBy: { position: 'asc' },
      },
    },
  });

  if (!list) {
    return NextResponse.json({ error: 'List not found' }, { status: 404 });
  }

  if (list.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const asins = list.items.map((item) => item.titleAsin);
  const metadataResults = asins.length > 0
    ? await fetchTitleMetadataBatch(asins)
    : [];

  const metadataMap = new Map<string, AudnexTitle>();
  asins.forEach((asin, i) => {
    const meta = metadataResults[i];
    if (meta) metadataMap.set(asin, meta);
  });

  const enrichedItems = enrichItemsWithMetadata(list.items, metadataMap);

  return NextResponse.json({
    id: list.id,
    name: list.name,
    description: list.description,
    type: list.type,
    tiers: list.tiers,
    createdAt: list.createdAt,
    updatedAt: list.updatedAt,
    items: enrichedItems,
  });
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

  const { name, description, type, tiers } = body as {
    name?: string;
    description?: string;
    type?: string;
    tiers?: string[];
  };

  if (type !== undefined) {
    return NextResponse.json(
      { error: 'List type is immutable and cannot be changed' },
      { status: 400 }
    );
  }

  const updateData: Record<string, unknown> = {};

  if (name !== undefined) {
    const nameValidation = validateListName(name);
    if (!nameValidation.valid) {
      return NextResponse.json({ error: nameValidation.error }, { status: 400 });
    }
    updateData.name = name;
  }

  if (description !== undefined) {
    if (description === null) {
      updateData.description = null;
    } else {
      const descValidation = validateListDescription(description);
      if (!descValidation.valid) {
        return NextResponse.json({ error: descValidation.error }, { status: 400 });
      }
      updateData.description = description;
    }
  }

  if (tiers !== undefined) {
    const tiersValidation = validateTiers(tiers);
    if (!tiersValidation.valid) {
      return NextResponse.json({ error: tiersValidation.error }, { status: 400 });
    }
    updateData.tiers = tiers;
  }

  const updatedList = await prisma.list.update({
    where: { id: listId },
    data: updateData,
    include: {
      items: {
        orderBy: { position: 'asc' },
      },
    },
  });

  return NextResponse.json(updatedList);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { listId } = await params;

  const list = await prisma.list.findUnique({
    where: { id: listId },
  });

  if (!list) {
    return NextResponse.json({ error: 'List not found' }, { status: 404 });
  }

  if (list.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.list.delete({
    where: { id: listId },
  });

  return new NextResponse(null, { status: 204 });
}
