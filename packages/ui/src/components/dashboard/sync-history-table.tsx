"use client";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface SyncEvent {
  id: string;
  syncedAt: string;
  titlesImported: number;
  newToCatalog: number;
  libraryCount: number;
  wishlistCount: number;
  success: boolean;
  warnings: string[];
}

interface SyncHistoryTableProps {
  history: SyncEvent[];
}

export function SyncHistoryTable({ history }: SyncHistoryTableProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  };

  if (history.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        <p>No sync history yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableCaption>Recent sync history (last 5 events)</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Imported</TableHead>
            <TableHead className="text-right">New</TableHead>
            <TableHead className="text-right">Library</TableHead>
            <TableHead className="text-right">Wishlist</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.map((event) => (
            <TableRow key={event.id}>
              <TableCell className="font-medium">
                {formatDate(event.syncedAt)}
              </TableCell>
              <TableCell className="text-right">
                {event.titlesImported}
              </TableCell>
              <TableCell className="text-right">
                {event.newToCatalog}
              </TableCell>
              <TableCell className="text-right">
                {event.libraryCount}
              </TableCell>
              <TableCell className="text-right">
                {event.wishlistCount}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Badge variant={event.success ? "default" : "destructive"}>
                    {event.success ? "Success" : "Failed"}
                  </Badge>
                  {event.warnings.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {event.warnings.length} warning{event.warnings.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
