import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { fetchTitleMetadata, fetchTitleMetadataBatch, AudnexTitle } from "@/lib/audnex";

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
    const source = searchParams.get("source") as "LIBRARY" | "WISHLIST" | "OTHER" | null;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "24");

    // Build source filter
    const sourceFilter = source ? { source } : {};

    if (search) {
      // Search: fetch all user's ASINs, batch-fetch metadata, filter in-memory
      const allEntries = await prisma.libraryEntry.findMany({
        where: { userId, ...sourceFilter },
        orderBy: { updatedAt: "desc" },
      });

      const asins = allEntries.map((e) => e.titleAsin);
      const metadataResults = await fetchTitleMetadataBatch(asins);

      const metadataMap = new Map<string, AudnexTitle>();
      asins.forEach((asin, i) => {
        const meta = metadataResults[i];
        if (meta) metadataMap.set(asin, meta);
      });

      // Filter by search term across title, author, narrator
      const searchLower = search.toLowerCase();
      const filtered = allEntries.filter((entry) => {
        const meta = metadataMap.get(entry.titleAsin);
        if (!meta) return false;
        if (meta.title.toLowerCase().includes(searchLower)) return true;
        if (meta.authors?.some((a) => a.name.toLowerCase().includes(searchLower))) return true;
        if (meta.narrators?.some((n) => n.name.toLowerCase().includes(searchLower))) return true;
        return false;
      });

      const total = filtered.length;
      const skip = (page - 1) * limit;
      const pageEntries = filtered.slice(skip, skip + limit);

      const transformedItems = pageEntries.map((item) =>
        transformEntry(item, metadataMap.get(item.titleAsin))
      );

      return NextResponse.json({
        items: transformedItems,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    }

    // No search: paginate at the DB level, fetch metadata only for current page
    const [entries, total] = await Promise.all([
      prisma.libraryEntry.findMany({
        where: { userId, ...sourceFilter },
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.libraryEntry.count({
        where: { userId, ...sourceFilter },
      }),
    ]);

    const pageAsins = entries.map((e) => e.titleAsin);
    const metadataResults = await fetchTitleMetadataBatch(pageAsins);

    const metadataMap = new Map<string, AudnexTitle>();
    pageAsins.forEach((asin, i) => {
      const meta = metadataResults[i];
      if (meta) metadataMap.set(asin, meta);
    });

    const transformedItems = entries.map((item) =>
      transformEntry(item, metadataMap.get(item.titleAsin))
    );

    return NextResponse.json({
      items: transformedItems,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error fetching library:", error);
    return NextResponse.json({ error: "Failed to fetch library" }, { status: 500 });
  }
}

/**
 * POST /api/library — Manually add a title to the user's library
 *
 * Body: { asin: string }
 * Creates a LibraryEntry with source=OTHER
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { asin } = body;

    if (!asin || typeof asin !== "string") {
      return NextResponse.json({ error: "ASIN is required" }, { status: 400 });
    }

    const trimmedAsin = asin.trim();

    // Check if already in library
    const existing = await prisma.libraryEntry.findUnique({
      where: { userId_titleAsin: { userId, titleAsin: trimmedAsin } },
    });

    if (existing) {
      return NextResponse.json(
        { error: "This title is already in your library" },
        { status: 409 }
      );
    }

    // Verify the ASIN exists in Audnexus
    const metadata = await fetchTitleMetadata(trimmedAsin);
    if (!metadata) {
      return NextResponse.json(
        { error: "Could not find this title. Please check the ASIN and try again." },
        { status: 404 }
      );
    }

    // Create library entry with source OTHER
    const entry = await prisma.libraryEntry.create({
      data: {
        userId,
        titleAsin: trimmedAsin,
        source: "OTHER",
        status: "Not Started",
        progress: 0,
        userRating: 0,
      },
    });

    return NextResponse.json({
      id: entry.id,
      asin: entry.titleAsin,
      title: metadata.title,
      authors: metadata.authors?.map((a) => a.name) || [],
      image: metadata.image || null,
    });
  } catch (error) {
    console.error("Error adding title:", error);
    return NextResponse.json({ error: "Failed to add title" }, { status: 500 });
  }
}

function transformEntry(
  item: { id: string; source: string; progress: number; userRating: number; updatedAt: Date; titleAsin: string },
  meta: AudnexTitle | undefined
) {
  return {
    id: item.id,
    source: item.source,
    progress: item.progress,
    userRating: item.userRating,
    updatedAt: item.updatedAt.toISOString(),
    title: {
      asin: item.titleAsin,
      title: meta?.title || item.titleAsin,
      subtitle: meta?.subtitle || null,
      authors: meta?.authors?.map((a) => a.name) || [],
      narrators: meta?.narrators?.map((n) => n.name) || [],
      runtimeLengthMin: meta?.runtimeLengthMin || null,
      image: meta?.image || null,
      rating: meta?.rating ? Number(meta.rating) : null,
    },
  };
}
