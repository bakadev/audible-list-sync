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

    // Query last 5 sync history events
    const history = await prisma.syncHistory.findMany({
      where: { userId },
      orderBy: { syncedAt: "desc" },
      take: 5,
    });

    return NextResponse.json({ history });
  } catch (error) {
    console.error("Error fetching sync history:", error);
    return NextResponse.json({ error: "Failed to fetch sync history" }, { status: 500 });
  }
}
