import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchTitleMetadata } from "@/lib/audnex";

/**
 * GET /api/library/lookup?asin=XXXX
 *
 * Look up a title by ASIN from Audnexus. Used by the manual add flow
 * to preview a title before adding it to the library.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const asin = searchParams.get("asin")?.trim();

    if (!asin) {
      return NextResponse.json({ error: "ASIN is required" }, { status: 400 });
    }

    const metadata = await fetchTitleMetadata(asin);

    if (!metadata) {
      return NextResponse.json(
        { error: "Title not found. Please check the ASIN and try again." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      asin: metadata.asin,
      title: metadata.title,
      subtitle: metadata.subtitle || null,
      authors: metadata.authors?.map((a) => a.name) || [],
      narrators: metadata.narrators?.map((n) => n.name) || [],
      image: metadata.image || null,
      runtimeLengthMin: metadata.runtimeLengthMin || null,
    });
  } catch (error) {
    console.error("Error looking up title:", error);
    return NextResponse.json({ error: "Failed to look up title" }, { status: 500 });
  }
}
