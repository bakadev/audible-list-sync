import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BookPlus } from "lucide-react";

export function ManualEmptyState() {
  return (
    <Card className="p-12 text-center">
      <div className="mx-auto max-w-md space-y-4">
        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-muted">
          <BookPlus className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-semibold">No Manual Titles</h2>
        <p className="text-sm text-muted-foreground">
          You haven&apos;t added any titles manually yet. Head to your dashboard
          to add titles that aren&apos;t in your Audible library.
        </p>
        <div className="pt-4">
          <Button asChild>
            <Link href="/dashboard">Add Titles from Dashboard</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
