import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * DELETE /api/library/:entryId — Remove a title from the user's library
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { entryId } = await params;
    const userId = session.user.id;

    // Verify the entry exists and belongs to this user
    const entry = await prisma.libraryEntry.findUnique({
      where: { id: entryId },
    });

    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    if (entry.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await prisma.libraryEntry.delete({
      where: { id: entryId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting library entry:", error);
    return NextResponse.json(
      { error: "Failed to remove title" },
      { status: 500 }
    );
  }
}
