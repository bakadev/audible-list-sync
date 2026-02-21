import { Metadata } from "next";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { SyncStatus } from "@/components/dashboard/sync-status";
import { ConnectExtensionButton } from "@/components/dashboard/connect-extension-button";
import { SyncHistoryTable } from "@/components/dashboard/sync-history-table";
import { ManualAddTitle } from "@/components/dashboard/manual-add-title";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ListOrdered } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Manage your Audible library and sync history",
};

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    return null; // Middleware will redirect
  }

  const userId = session.user.id;

  // Fetch sync history and library stats
  const [lastSync, libraryStats, syncHistory] = await Promise.all([
    prisma.syncHistory.findFirst({
      where: { userId },
      orderBy: { syncedAt: "desc" },
    }),
    prisma.libraryEntry.aggregate({
      where: { userId },
      _count: { id: true },
    }),
    prisma.syncHistory.findMany({
      where: { userId },
      orderBy: { syncedAt: "desc" },
      take: 5,
    }),
  ]);

  // Get library, wishlist, and list counts
  const [libraryCount, wishlistCount, otherCount, listCount] = await Promise.all([
    prisma.libraryEntry.count({
      where: { userId, source: "LIBRARY" },
    }),
    prisma.libraryEntry.count({
      where: { userId, source: "WISHLIST" },
    }),
    prisma.libraryEntry.count({
      where: { userId, source: "OTHER" },
    }),
    prisma.list
      .count({
        where: { userId },
      })
      .catch(() => 0), // Graceful fallback if List table doesn't exist yet
  ]);

  const totalItems = libraryStats._count.id;
  const hasSyncedBefore = !!lastSync;

  return (
    <div className="container max-w-6xl py-8 md:py-12">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold leading-tight md:text-5xl">
            Welcome back, {session.user.name?.split(" ")[0] || "there"}!
          </h1>
          <p className="text-base text-muted-foreground">
            Manage your Audible library and create recommendation lists.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/lists/new">
            <Card className="p-6 transition-colors hover:bg-muted/50">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Create New List</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Create a recommendation list or tier ranking from your audiobook library.
                </p>
              </div>
            </Card>
          </Link>

          <Link href="/lists">
            <Card className="p-6 transition-colors hover:bg-muted/50">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ListOrdered className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Manage Lists</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  {listCount > 0
                    ? `You have ${listCount} ${listCount === 1 ? "list" : "lists"}. Edit, reorder, or share them.`
                    : "View and manage your recommendation lists and tier rankings."}
                </p>
              </div>
            </Card>
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <SyncStatus
            lastSyncedAt={lastSync?.syncedAt?.toISOString() || null}
            totalItems={totalItems}
            libraryCount={libraryCount}
            wishlistCount={wishlistCount}
            otherCount={otherCount}
          />

          <Card className="p-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                {hasSyncedBefore ? "Update Your Library" : "Connect Extension"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {hasSyncedBefore
                  ? "Sync your latest Audible library changes."
                  : "Connect the browser extension to sync your Audible library for the first time."}
              </p>
              <ConnectExtensionButton hasSyncedBefore={hasSyncedBefore} />
            </div>
          </Card>
        </div>

        <ManualAddTitle />

        {!hasSyncedBefore && (
          <Card className="p-6 bg-muted/50">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">How to Connect</h3>
              <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                <li>Click the &quot;Connect Extension&quot; button above</li>
                <li>A new tab will open to Audible with a secure sync token</li>
                <li>The browser extension will automatically detect and use the token</li>
                <li>Your library will be synced in the background</li>
                <li>Return here to view your synced titles</li>
              </ol>
              <p className="text-xs text-muted-foreground pt-2">
                Note: The browser extension is not yet available. This is the website-side
                implementation only.
              </p>
            </div>
          </Card>
        )}

        {hasSyncedBefore && syncHistory.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Sync History</h2>
            <SyncHistoryTable
              history={syncHistory.map((h) => ({
                id: h.id,
                syncedAt: h.syncedAt.toISOString(),
                titlesImported: h.titlesImported,
                newToCatalog: h.newToCatalog,
                libraryCount: h.libraryCount,
                wishlistCount: h.wishlistCount,
                success: h.success,
                warnings: h.warnings,
              }))}
            />
          </div>
        )}
      </div>
    </div>
  );
}
