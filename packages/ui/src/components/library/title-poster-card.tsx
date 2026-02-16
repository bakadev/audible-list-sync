import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";

interface TitlePosterCardProps {
  asin: string;
  title: string;
  authors: string[];
  coverImageUrl?: string | null;
  rating?: number | null;
  duration?: number | null;
  source: "LIBRARY" | "WISHLIST" | "OTHER";
  listeningProgress?: number;
}

export function TitlePosterCard({
  asin,
  title,
  authors,
  coverImageUrl,
  rating,
  duration,
  source,
  listeningProgress = 0,
}: TitlePosterCardProps) {
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
    <Link href={`/library/${asin}`}>
      <div className="group space-y-3">
        {/* Poster Image */}
        <div className="relative aspect-[2/3] overflow-hidden rounded-lg border bg-muted shadow-md transition-all hover:shadow-xl hover:scale-[1.02]">
          {coverImageUrl ? (
            <Image
              src={coverImageUrl}
              alt={title}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
              loading="lazy"
              quality={75}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-12 w-12 text-muted-foreground"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                />
              </svg>
            </div>
          )}

          {/* Progress Bar Overlay */}
          {listeningProgress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${listeningProgress}%` }}
              />
            </div>
          )}

          {/* Source Badge */}
          <div className="absolute right-2 top-2">
            <Badge
              variant={source === "LIBRARY" ? "default" : source === "WISHLIST" ? "outline" : "secondary"}
              className="text-xs shadow-sm"
            >
              {source}
            </Badge>
          </div>

          {/* Rating */}
          {rating && (
            <div className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              <svg
                className="h-3 w-3 fill-yellow-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {rating.toFixed(1)}
            </div>
          )}
        </div>

        {/* Title and Metadata */}
        <div className="space-y-1">
          <h3 className="line-clamp-2 text-sm font-medium leading-tight transition-colors group-hover:text-primary">
            {title}
          </h3>
          <p className="line-clamp-1 text-xs text-muted-foreground">{authors.join(", ")}</p>
          {duration && <p className="text-xs text-muted-foreground">{formatDuration(duration)}</p>}
        </div>
      </div>
    </Link>
  );
}
