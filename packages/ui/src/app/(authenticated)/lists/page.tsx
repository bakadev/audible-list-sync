import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Lists",
  description: "Manage your audiobook recommendation lists and tier rankings",
};

export default async function ListsPage() {
  const session = await auth();

  if (!session?.user) {
    return null; // Middleware will redirect
  }

  return (
    <div className="container max-w-6xl py-8 md:py-12">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold leading-tight md:text-5xl">
            Your Lists
          </h1>
          <p className="text-base text-muted-foreground">
            Create and manage recommendation lists and tier rankings from your audiobook library.
          </p>
        </div>

        <Card className="p-12">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-16 w-16 text-muted-foreground"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"
              />
            </svg>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">No Lists Yet</h3>
              <p className="max-w-md text-sm text-muted-foreground">
                Lists feature coming soon! You&apos;ll be able to create curated recommendation
                lists and tier rankings from your audiobook collection.
              </p>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="p-6">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Recommendation Lists</h3>
              <p className="text-sm text-muted-foreground">
                Create themed, ordered lists with descriptions like &quot;Funniest LitRPG&quot; or
                &quot;Best Series for Road Trips&quot;.
              </p>
            </div>
          </Card>

          <Card className="p-6">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Tier Lists</h3>
              <p className="text-sm text-muted-foreground">
                Rank your audiobooks into tiers (S, A, B, C) with drag-and-drop organization.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
