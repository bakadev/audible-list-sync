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
    <div className="container py-10">
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">Your Library</h1>
          <p className="text-lg text-muted-foreground">
            Browse and search your Audible collection
          </p>
        </div>

        <LibraryContent />
      </div>
    </div>
  );
}
