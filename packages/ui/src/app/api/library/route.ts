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
    const limit = parseInt(searchParams.get("limit") || "1000"); // Increased from 50 to support large libraries
    const skip = (page - 1) * limit;

    // Build search filter
    const searchFilter = search
      ? {
          title: {
            OR: [
              { title: { contains: search, mode: "insensitive" as const } },
              { authors: { some: { author: { name: { contains: search, mode: "insensitive" as const } } } } },
              { narrators: { some: { narrator: { name: { contains: search, mode: "insensitive" as const } } } } },
            ],
          },
        }
      : {};

    // Query user library with title relations
    const [items, total] = await Promise.all([
      prisma.libraryEntry.findMany({
        where: {
          userId,
          ...searchFilter,
        },
        include: {
          title: {
            include: {
              authors: {
                include: {
                  author: true,
                },
              },
              narrators: {
                include: {
                  narrator: true,
                },
              },
              genres: {
                include: {
                  genre: true,
                },
              },
              series: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: limit,
        skip,
      }),
      prisma.libraryEntry.count({
        where: {
          userId,
          ...searchFilter,
        },
      }),
    ]);

    // Transform the data to match the expected client format
    const transformedItems = items.map((item) => ({
      id: item.id,
      source: item.source,
      progress: item.progress,
      userRating: item.userRating,
      updatedAt: item.updatedAt.toISOString(),
      title: {
        asin: item.title.asin,
        title: item.title.title,
        subtitle: item.title.subtitle,
        authors: item.title.authors.map((a) => a.author.name),
        narrators: item.title.narrators.map((n) => n.narrator.name),
        runtimeLengthMin: item.title.runtimeLengthMin,
        image: item.title.image,
        rating: item.title.rating ? Number(item.title.rating) : null,
      },
    }));

    return NextResponse.json({
      items: transformedItems,
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
