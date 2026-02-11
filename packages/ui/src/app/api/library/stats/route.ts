import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get aggregate stats
    const [totalCount, libraryCount, wishlistCount, lastSync, durationSum] = await Promise.all([
      prisma.userLibrary.count({
        where: { userId },
      }),
      prisma.userLibrary.count({
        where: { userId, source: "LIBRARY" },
      }),
      prisma.userLibrary.count({
        where: { userId, source: "WISHLIST" },
      }),
      prisma.syncHistory.findFirst({
        where: { userId },
        orderBy: { syncedAt: "desc" },
        select: { syncedAt: true },
      }),
      prisma.userLibrary.findMany({
        where: { userId },
        include: { title: { select: { duration: true } } },
      }),
    ]);

    // Calculate total duration in minutes
    const totalDuration = durationSum.reduce((sum, item) => sum + (item.title.duration || 0), 0);

    return NextResponse.json({
      total: totalCount,
      library: libraryCount,
      wishlist: wishlistCount,
      totalDuration,
      lastSync: lastSync?.syncedAt?.toISOString() || null,
    });
  } catch (error) {
    console.error("Error fetching library stats:", error);
    return NextResponse.json({ error: "Failed to fetch library stats" }, { status: 500 });
  }
}
