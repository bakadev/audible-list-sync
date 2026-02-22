import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { fetchTitleMetadataBatch, AudnexTitle } from '@/lib/audnex';
import {
  validateListName,
  validateListDescription,
  validateTiers,
} from '@/lib/list-validation';
import { getSignedImageUrl } from '@/lib/s3';
import { getTemplate } from '@/lib/image-generator/templates/registry';

// Ensure templates are registered
import '@/lib/image-generator/templates/grid-3x3';
import '@/lib/image-generator/templates/hero';
import '@/lib/image-generator/templates/minimal-banner';
import '@/lib/image-generator/templates/hero-plus';
import '@/lib/image-generator/templates/tier-list';

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

  // Generate presigned URLs for image keys if images are ready
  let imageOgUrl: string | null = null;
  let imageSquareUrl: string | null = null;

  if (list.imageStatus === 'READY') {
    if (list.imageOgKey) {
      try {
        imageOgUrl = await getSignedImageUrl(list.imageOgKey);
      } catch (e) {
        console.error('Failed to generate presigned URL for OG image:', e);
      }
    }
    if (list.imageSquareKey) {
      try {
        imageSquareUrl = await getSignedImageUrl(list.imageSquareKey);
      } catch (e) {
        console.error('Failed to generate presigned URL for square image:', e);
      }
    }
  }

  return NextResponse.json({
    id: list.id,
    name: list.name,
    description: list.description,
    type: list.type,
    tiers: list.tiers,
    imageTemplateId: list.imageTemplateId,
    imageVersion: list.imageVersion,
    imageStatus: list.imageStatus,
    imageOgKey: list.imageOgKey,
    imageSquareKey: list.imageSquareKey,
    imageGeneratedAt: list.imageGeneratedAt,
    imageOgUrl,
    imageSquareUrl,
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

  const { name, description, type, tiers, imageTemplateId, regenerateImage } = body as {
    name?: string;
    description?: string;
    type?: string;
    tiers?: string[];
    imageTemplateId?: string;
    regenerateImage?: boolean;
  };

  if (type !== undefined) {
    return NextResponse.json(
      { error: 'List type is immutable and cannot be changed' },
      { status: 400 }
    );
  }

  // Validate template ID if provided
  if (imageTemplateId !== undefined && imageTemplateId !== null) {
    const template = getTemplate(imageTemplateId);
    if (!template) {
      return NextResponse.json(
        { error: `Invalid template: ${imageTemplateId}` },
        { status: 400 }
      );
    }
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

  // Handle template changes
  if (imageTemplateId !== undefined) {
    updateData.imageTemplateId = imageTemplateId;
  }

  // Determine if regeneration is needed
  // If regenerateImage is explicitly false, skip auto-detection (caller will handle it)
  const shouldRegenerate =
    regenerateImage === false
      ? false
      : regenerateImage === true ||
        (imageTemplateId !== undefined && imageTemplateId !== list.imageTemplateId) ||
        (name !== undefined && name !== list.name) ||
        (description !== undefined && description !== list.description);

  if (shouldRegenerate && (imageTemplateId || list.imageTemplateId)) {
    updateData.imageVersion = list.imageVersion + 1;
    updateData.imageStatus = 'GENERATING';
    updateData.imageError = null;
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

  // Trigger async image generation if needed (fire-and-forget)
  if (shouldRegenerate && updatedList.imageTemplateId) {
    triggerImageGeneration(updatedList).catch((err) => {
      console.error('Image generation failed:', err);
    });
  }

  return NextResponse.json(updatedList);
}

/**
 * Fire-and-forget image generation.
 * Updates the DB with results or failure status.
 */
async function triggerImageGeneration(list: {
  id: string;
  name: string;
  description: string | null;
  type: string;
  tiers: unknown;
  imageTemplateId: string | null;
  imageVersion: number;
  userId: string;
}) {
  try {
    const { generateListImages } = await import('@/lib/image-generator/generateListImages');
    const { uploadImage } = await import('@/lib/s3');

    // Fetch items with metadata for cover images
    const items = await prisma.listItem.findMany({
      where: { listId: list.id },
      orderBy: [{ tier: 'asc' }, { position: 'asc' }],
    });

    const { fetchTitleMetadataBatch } = await import('@/lib/audnex');
    const asins = items.map((i) => i.titleAsin);
    const metadata = asins.length > 0 ? await fetchTitleMetadataBatch(asins) : [];

    const books = items.map((item, idx) => ({
      asin: item.titleAsin,
      coverImageUrl: metadata[idx]?.image || null,
      title: metadata[idx]?.title || item.titleAsin,
      tier: item.tier,
    }));

    // Fetch user for username
    const user = await prisma.user.findUnique({
      where: { id: list.userId },
      select: { username: true, name: true },
    });

    // Build tier labels for tier lists
    const tierLabels = list.type === 'TIER' && Array.isArray(list.tiers)
      ? (list.tiers as string[])
      : undefined;

    const images = await generateListImages({
      listId: list.id,
      title: list.name,
      description: list.description || undefined,
      username: user?.username || user?.name || 'Unknown',
      books,
      templateId: list.imageTemplateId!,
      tierLabels,
    });

    // Upload to S3
    const version = list.imageVersion;
    const ogKey = `lists/${list.id}/v${version}/og.png`;
    const squareKey = `lists/${list.id}/v${version}/square.png`;

    await Promise.all([
      images.og ? uploadImage(ogKey, images.og.buffer) : Promise.resolve(),
      images.square ? uploadImage(squareKey, images.square.buffer) : Promise.resolve(),
    ]);

    // Update DB with success
    await prisma.list.update({
      where: { id: list.id },
      data: {
        imageOgKey: images.og ? ogKey : null,
        imageSquareKey: images.square ? squareKey : null,
        imageStatus: 'READY',
        imageGeneratedAt: new Date(),
        imageError: null,
      },
    });
  } catch (error) {
    console.error(`Image generation failed for list ${list.id}:`, error);
    await prisma.list.update({
      where: { id: list.id },
      data: {
        imageStatus: 'FAILED',
        imageError: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
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
