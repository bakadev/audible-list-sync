import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Build search filter
    const searchFilter = search
      ? {
          OR: [
            { title: { title: { contains: search, mode: "insensitive" as const } } },
            { title: { authors: { hasSome: [search] } } },
            { title: { narrators: { hasSome: [search] } } },
          ],
        }
      : {};

    // Query user library with title relations
    const [items, total] = await Promise.all([
      prisma.userLibrary.findMany({
        where: {
          userId,
          ...searchFilter,
        },
        include: {
          title: true,
        },
        orderBy: {
          dateAdded: "desc",
        },
        take: limit,
        skip,
      }),
      prisma.userLibrary.count({
        where: {
          userId,
          ...searchFilter,
        },
      }),
    ]);

    return NextResponse.json({
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching library:", error);
    return NextResponse.json({ error: "Failed to fetch library" }, { status: 500 });
  }
}
