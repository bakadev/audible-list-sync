import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface TitleDetailPageProps {
  params: Promise<{ asin: string }>;
}

export async function generateMetadata({ params }: TitleDetailPageProps): Promise<Metadata> {
  const { asin } = await params;

  const title = await prisma.titleCatalog.findUnique({
    where: { asin },
  });

  if (!title) {
    return {
      title: "Title Not Found",
    };
  }

  return {
    title: title.title,
    description: title.summary || `${title.title} by ${title.authors.join(", ")}`,
  };
}

export default async function TitleDetailPage({ params }: TitleDetailPageProps) {
  const session = await auth();
  const { asin } = await params;

  if (!session?.user) {
    return null;
  }

  const title = await prisma.titleCatalog.findUnique({
    where: { asin },
  });

  if (!title) {
    notFound();
  }

  const userLibraryEntry = await prisma.userLibrary.findFirst({
    where: {
      userId: session.user.id,
      titleId: title.id,
    },
  });

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDate = (date: Date | null) => {
    if (!date) return null;
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  return (
    <div className="container max-w-6xl py-8 md:py-12">
      <div className="space-y-6">
        {/* Back Button */}
        <Link href="/library">
          <Button variant="ghost" size="sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="mr-2 h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              />
            </svg>
            Back to Library
          </Button>
        </Link>

        {/* Hero/Banner Section */}
        <div className="grid gap-6 md:grid-cols-[auto_1fr]">
          {/* Cover Image */}
          <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg border bg-muted shadow-lg md:w-64">
            {title.coverImageUrl ? (
              <Image
                src={title.coverImageUrl}
                alt={title.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 256px"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center">
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
                    d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Title Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-bold md:text-4xl">{title.title}</h1>
                {title.rating && (
                  <div className="flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 text-sm font-semibold text-white dark:bg-white/10">
                    <svg
                      className="h-4 w-4 fill-yellow-400"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {title.rating.toFixed(1)}
                  </div>
                )}
              </div>
              {title.subtitle && (
                <p className="text-lg text-muted-foreground">{title.subtitle}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {title.categories.length > 0 && title.categories.map((category) => (
                <Badge key={category} variant="secondary">
                  {category}
                </Badge>
              ))}
            </div>

            <div className="grid gap-3 text-sm">
              {title.authors.length > 0 && (
                <div>
                  <span className="font-medium text-muted-foreground">Authors:</span>{" "}
                  <span>{title.authors.join(", ")}</span>
                </div>
              )}
              {title.narrators.length > 0 && (
                <div>
                  <span className="font-medium text-muted-foreground">Narrated by:</span>{" "}
                  <span>{title.narrators.join(", ")}</span>
                </div>
              )}
              {title.duration && (
                <div>
                  <span className="font-medium text-muted-foreground">Length:</span>{" "}
                  <span>{formatDuration(title.duration)}</span>
                </div>
              )}
              {title.releaseDate && (
                <div>
                  <span className="font-medium text-muted-foreground">Release date:</span>{" "}
                  <span>{formatDate(title.releaseDate)}</span>
                </div>
              )}
              {title.publisher && (
                <div>
                  <span className="font-medium text-muted-foreground">Publisher:</span>{" "}
                  <span>{title.publisher}</span>
                </div>
              )}
            </div>

            {userLibraryEntry && (
              <div className="rounded-lg border bg-card p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Your Progress</span>
                    <Badge variant={userLibraryEntry.source === "LIBRARY" ? "default" : "outline"}>
                      {userLibraryEntry.source}
                    </Badge>
                  </div>
                  {userLibraryEntry.listeningProgress > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Listening Progress</span>
                        <span>{userLibraryEntry.listeningProgress}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${userLibraryEntry.listeningProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        {title.summary && (
          <div className="space-y-3 border-t pt-6">
            <h2 className="text-lg font-semibold">Summary</h2>
            <p className="leading-relaxed text-muted-foreground">{title.summary}</p>
          </div>
        )}
      </div>
    </div>
  );
}
