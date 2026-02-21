import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import {
  validateListName,
  validateListDescription,
  validateListType,
  validateTiers,
} from '@/lib/list-validation';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const lists = await prisma.list.findMany({
    where: { userId: session.user.id },
    include: {
      _count: {
        select: { items: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const result = lists.map((list) => ({
    id: list.id,
    name: list.name,
    description: list.description,
    type: list.type,
    tiers: list.tiers,
    itemCount: list._count.items,
    createdAt: list.createdAt,
    updatedAt: list.updatedAt,
  }));

  return NextResponse.json({ lists: result });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

  const nameValidation = validateListName(name);
  if (!nameValidation.valid) {
    return NextResponse.json({ error: nameValidation.error }, { status: 400 });
  }

  if (description !== undefined && description !== null) {
    const descValidation = validateListDescription(description);
    if (!descValidation.valid) {
      return NextResponse.json({ error: descValidation.error }, { status: 400 });
    }
  }

  const typeValidation = validateListType(type);
  if (!typeValidation.valid) {
    return NextResponse.json({ error: typeValidation.error }, { status: 400 });
  }

  const resolvedTiers =
    type === 'TIER' ? (tiers ?? ['S', 'A', 'B', 'C', 'D']) : null;

  if (type === 'TIER' && resolvedTiers) {
    const tiersValidation = validateTiers(resolvedTiers);
    if (!tiersValidation.valid) {
      return NextResponse.json({ error: tiersValidation.error }, { status: 400 });
    }
  }

  const list = await prisma.list.create({
    data: {
      userId: session.user.id,
      name: name!,
      description: description || null,
      type: type as 'RECOMMENDATION' | 'TIER',
      tiers: resolvedTiers,
    },
    include: {
      items: true,
    },
  });

  return NextResponse.json(list, { status: 201 });
}
