import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="flex flex-1 flex-col items-center justify-center py-16 md:py-24 lg:py-32">
        <div className="container max-w-4xl space-y-8 px-4">
          <div className="space-y-6 text-center">
            <div className="inline-flex items-center rounded-full border bg-muted px-3 py-1 text-sm">
              <span className="mr-2">✨</span>
              <span>Sync, browse, and organize your audiobooks</span>
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl md:leading-[1.2]">
              The perfect place for{" "}
              <span className="text-primary">Audible listeners</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Sync your Audible library, search your collection, and create recommendation lists to share with fellow audiobook enthusiasts.
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="text-base shadow-sm hover:shadow">
              <Link href="/signin">Get Started with Google</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t bg-muted/50 py-16 md:py-24">
        <div className="container max-w-6xl px-4">
          <h2 className="mb-12 text-center text-2xl font-bold md:text-3xl">Features</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="p-6">
              <div className="space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="h-6 w-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold">Sync Your Library</h3>
                <p className="text-muted-foreground">
                  Securely sync your Audible library and wishlist with one click. Keep your collection up to date.
                </p>
              </div>
            </Card>

            <Card className="p-6">
              <div className="space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="h-6 w-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold">Browse & Search</h3>
                <p className="text-muted-foreground">
                  Easily search through your entire collection. Filter by title, author, narrator, and more.
                </p>
              </div>
            </Card>

            <Card className="p-6">
              <div className="space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="h-6 w-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold">Curate Lists</h3>
                <p className="text-muted-foreground">
                  Create recommendation lists and tier lists to organize and share your favorite audiobooks.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 md:py-24">
        <div className="container max-w-4xl px-4">
          <h2 className="mb-12 text-center text-2xl font-bold md:text-3xl">How It Works</h2>
          <div className="space-y-8">
            <div className="flex gap-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                1
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Sign In with Google</h3>
                <p className="text-muted-foreground">
                  Create an account using your Google credentials. Quick and secure.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                2
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Connect Your Library</h3>
                <p className="text-muted-foreground">
                  Install our browser extension and sync your Audible library. We only read your public library data.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                3
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Browse and Organize</h3>
                <p className="text-muted-foreground">
                  Search your collection, track your progress, and create lists to share with others.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <div className="container">
          <p>
            Your data is private and secure. We never access your Audible credentials.
          </p>
        </div>
      </footer>
    </div>
  );
}
