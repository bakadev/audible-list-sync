"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SyncStatusProps {
  lastSyncedAt: string | null;
  totalItems: number;
  libraryCount: number;
  wishlistCount: number;
}

export function SyncStatus({
  lastSyncedAt,
  totalItems,
  libraryCount,
  wishlistCount,
}: SyncStatusProps) {
  const hasData = totalItems > 0;
  const syncDate = lastSyncedAt ? new Date(lastSyncedAt) : null;

  const getConnectionState = () => {
    if (!hasData) {
      return {
        label: "Not Connected",
        variant: "outline" as const,
        description: "No library data synced yet",
      };
    }
    return {
      label: "Connected",
      variant: "default" as const,
      description: syncDate ? `Last synced ${formatTimeAgo(syncDate)}` : "Library synced",
    };
  };

  const state = getConnectionState();

  return (
    <Card className="p-6 transition-shadow hover:shadow-md">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Sync Status</h3>
          <Badge variant={state.variant}>{state.label}</Badge>
        </div>

        <p className="text-sm text-muted-foreground">{state.description}</p>

        {hasData && (
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="space-y-1">
              <p className="text-3xl font-bold">{totalItems}</p>
              <p className="text-xs text-muted-foreground">Total Items</p>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold">{libraryCount}</p>
              <p className="text-xs text-muted-foreground">Library</p>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold">{wishlistCount}</p>
              <p className="text-xs text-muted-foreground">Wishlist</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;

  return date.toLocaleDateString();
}
