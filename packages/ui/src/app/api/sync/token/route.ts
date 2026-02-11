import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateSyncToken } from '@/lib/jwt';
import prisma from '@/lib/prisma';

export async function POST() {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Check if user has synced before
    const lastSync = await prisma.syncHistory.findFirst({
      where: { userId },
      orderBy: { syncedAt: 'desc' },
    });

    const hasSyncedBefore = !!lastSync;

    // Generate JWT sync token
    const { token, jti, expiresAt } = generateSyncToken(userId);

    // Store token in database for validation and single-use tracking
    await prisma.syncToken.create({
      data: {
        jti,
        userId,
        expiresAt,
        used: false,
      },
    });

    // Construct Audible URL with token in fragment (not query string)
    const audibleUrl = `https://www.audible.com/lib#token=${token}`;

    return NextResponse.json({
      success: true,
      token,
      audibleUrl,
      expiresAt: expiresAt.toISOString(),
      hasSyncedBefore,
      lastSyncedAt: lastSync?.syncedAt?.toISOString() || null,
    });
  } catch (error) {
    console.error('Error generating sync token:', error);
    return NextResponse.json(
      { error: 'Failed to generate sync token' },
      { status: 500 }
    );
  }
}
