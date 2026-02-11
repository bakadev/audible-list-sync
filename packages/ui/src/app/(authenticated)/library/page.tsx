import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { LibraryContent } from "@/components/library/library-content";

export const metadata: Metadata = {
  title: "Library",
  description: "Browse and search your Audible collection",
};

export default async function LibraryPage() {
  const session = await auth();

  if (!session?.user) {
    return null; // Middleware will redirect
  }

  return (
    <div className="container max-w-6xl py-8 md:py-12">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold md:text-4xl">Your Library</h1>
          <p className="text-base text-muted-foreground md:text-lg">
            Browse and search your Audible collection
          </p>
        </div>

        <LibraryContent />
      </div>
    </div>
  );
}
