import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
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

    const lists = await prisma.list.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        tiers: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { items: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const formattedLists = lists.map(({ _count, ...list }) => ({
      ...list,
      itemCount: _count.items,
    }));

    return NextResponse.json({
      user: {
        username: user.username,
        name: user.name,
        image: user.image,
      },
      lists: formattedLists,
    });
  } catch (error) {
    console.error('Error fetching user lists:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
