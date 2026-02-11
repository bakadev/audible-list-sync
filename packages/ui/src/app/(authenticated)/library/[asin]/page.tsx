import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    <div className="mx-auto w-full max-w-6xl space-y-4 px-4 lg:px-0">
      {/* Back Button */}
      <Link href="/library">
        <Button variant="ghost" size="sm" className="h-8 gap-2 px-3 text-xs">
          <ArrowLeft width="14" height="14" />
          Back to Library
        </Button>
      </Link>

      {/* Banner/Backdrop Image */}
      <div
        className="relative aspect-banner max-h-[55dvh] overflow-hidden border-b bg-muted md:rounded-lg lg:border"
        style={{
          backgroundImage: title.coverImageUrl
            ? `url(${title.coverImageUrl})`
            : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: title.coverImageUrl ? "blur(20px) brightness(40%)" : undefined,
        }}
      >
        {!title.coverImageUrl && (
          <div className="flex h-full items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-24 w-24 text-muted-foreground"
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

      {/* Poster + Metadata Layout */}
      <div className="flex gap-4">
        {/* Poster (pulls up into banner) */}
        <div className="-mt-20 w-2/5 md:w-1/3 lg:-mt-32">
          <div className="relative aspect-poster overflow-hidden rounded-lg border bg-muted shadow">
            {title.coverImageUrl ? (
              <Image
                src={title.coverImageUrl}
                alt={title.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 40vw, 33vw"
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
        </div>

        {/* Metadata */}
        <div className="flex w-3/5 flex-col gap-2 md:w-2/3">
          {/* Release Date */}
          {title.releaseDate && (
            <p className="text-xs text-muted-foreground">
              {formatDate(title.releaseDate)}
            </p>
          )}

          {/* Title */}
          <h1 className="text-lg font-bold leading-tight md:text-4xl">
            {title.title}
          </h1>

          {/* Genre/Category Badges */}
          {title.categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {title.categories.map((category) => (
                <Badge
                  key={category}
                  variant="outline"
                  className="rounded-md border px-2.5 py-0.5 text-xs font-semibold"
                >
                  {category}
                </Badge>
              ))}
            </div>
          )}

          {/* Rating Badge */}
          {title.rating && (
            <div>
              <Badge className="rounded-md border-transparent bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground shadow">
                ⭐ {title.rating.toFixed(1)}
              </Badge>
            </div>
          )}

          {/* Description */}
          {title.summary && (
            <p className="text-xs leading-5 text-muted-foreground md:text-sm md:leading-6">
              {title.summary}
            </p>
          )}

          {/* Action Buttons */}
          <div className="mt-2 flex flex-wrap gap-2">
            {userLibraryEntry && (
              <Badge
                variant={userLibraryEntry.source === "LIBRARY" ? "default" : "outline"}
                className="rounded-md px-2.5 py-0.5 text-xs font-semibold"
              >
                {userLibraryEntry.source}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="details" className="mt-6">
        <TabsList className="inline-flex h-9 rounded-lg bg-muted p-1 text-muted-foreground">
          <TabsTrigger
            value="details"
            className="rounded-md px-3 py-1 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow"
          >
            Details
          </TabsTrigger>
          {userLibraryEntry && (
            <TabsTrigger
              value="progress"
              className="rounded-md px-3 py-1 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow"
            >
              Your Progress
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="details" className="mt-4 space-y-4">
          {/* Metadata Grid */}
          <div className="space-y-3 rounded-lg border bg-card p-4">
            {title.authors.length > 0 && (
              <div className="flex gap-2 text-sm">
                <span className="font-medium text-muted-foreground">Authors:</span>
                <span>{title.authors.join(", ")}</span>
              </div>
            )}
            {title.narrators.length > 0 && (
              <div className="flex gap-2 text-sm">
                <span className="font-medium text-muted-foreground">Narrated by:</span>
                <span>{title.narrators.join(", ")}</span>
              </div>
            )}
            {title.duration && (
              <div className="flex gap-2 text-sm">
                <span className="font-medium text-muted-foreground">Length:</span>
                <span>{formatDuration(title.duration)}</span>
              </div>
            )}
            {title.publisher && (
              <div className="flex gap-2 text-sm">
                <span className="font-medium text-muted-foreground">Publisher:</span>
                <span>{title.publisher}</span>
              </div>
            )}
            {title.language && (
              <div className="flex gap-2 text-sm">
                <span className="font-medium text-muted-foreground">Language:</span>
                <span>{title.language}</span>
              </div>
            )}
          </div>
        </TabsContent>

        {userLibraryEntry && (
          <TabsContent value="progress" className="mt-4">
            <div className="space-y-4 rounded-lg border bg-card p-4">
              {userLibraryEntry.listeningProgress > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Listening Progress</span>
                    <span className="text-muted-foreground">
                      {userLibraryEntry.listeningProgress}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${userLibraryEntry.listeningProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed py-8 text-center">
                  <p className="text-sm">No progress recorded yet</p>
                  <p className="text-xs text-muted-foreground">
                    Start listening to track your progress
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
