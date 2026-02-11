import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TitleCardProps {
  title: string;
  subtitle?: string | null;
  authors: string[];
  narrators: string[];
  coverImageUrl?: string | null;
  duration?: number | null;
  rating?: number | null;
  source: "LIBRARY" | "WISHLIST";
  listeningProgress?: number;
}

export function TitleCard({
  title,
  subtitle,
  authors,
  narrators,
  coverImageUrl,
  duration,
  rating,
  source,
  listeningProgress = 0,
}: TitleCardProps) {
  const formatDuration = (minutes: number | null | undefined) => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex gap-4 p-4">
        {/* Cover Image */}
        <div className="relative h-32 w-24 shrink-0 overflow-hidden rounded bg-muted">
          {coverImageUrl ? (
            <Image
              src={coverImageUrl}
              alt={title}
              fill
              className="object-cover"
              sizes="96px"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-8 w-8 text-muted-foreground"
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

        {/* Content */}
        <div className="flex flex-1 flex-col gap-2">
          <div className="space-y-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold leading-tight">{title}</h3>
              <Badge variant={source === "LIBRARY" ? "default" : "outline"}>
                {source}
              </Badge>
            </div>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>

          {authors.length > 0 && (
            <p className="text-sm">
              <span className="text-muted-foreground">By:</span>{" "}
              {authors.join(", ")}
            </p>
          )}

          {narrators.length > 0 && (
            <p className="text-sm">
              <span className="text-muted-foreground">Narrated by:</span>{" "}
              {narrators.join(", ")}
            </p>
          )}

          <div className="mt-auto flex items-center gap-4 text-sm text-muted-foreground">
            {duration && <span>{formatDuration(duration)}</span>}
            {rating && (
              <span className="flex items-center gap-1">
                <svg
                  className="h-4 w-4 fill-yellow-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {rating.toFixed(1)}
              </span>
            )}
          </div>

          {/* Progress Bar */}
          {listeningProgress > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>{listeningProgress}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${listeningProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
