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
    const [totalCount, libraryCount, wishlistCount, lastSync] = await Promise.all([
      prisma.libraryEntry.count({
        where: { userId },
      }),
      prisma.libraryEntry.count({
        where: { userId, source: "LIBRARY" },
      }),
      prisma.libraryEntry.count({
        where: { userId, source: "WISHLIST" },
      }),
      prisma.syncHistory.findFirst({
        where: { userId },
        orderBy: { syncedAt: "desc" },
        select: { syncedAt: true },
      }),
    ]);

    return NextResponse.json({
      total: totalCount,
      library: libraryCount,
      wishlist: wishlistCount,
      totalDuration: 0, // Duration requires Audnexus metadata fetch — omitted for performance
      lastSync: lastSync?.syncedAt?.toISOString() || null,
    });
  } catch (error) {
    console.error("Error fetching library stats:", error);
    return NextResponse.json({ error: "Failed to fetch library stats" }, { status: 500 });
  }
}
