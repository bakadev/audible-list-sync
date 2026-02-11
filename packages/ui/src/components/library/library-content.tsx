"use client";

import { useState, useEffect, useCallback } from "react";
import { TitlePosterCard } from "./title-poster-card";
import { SearchBar } from "./search-bar";
import { EmptyState } from "./empty-state";
import { LibrarySkeleton } from "./library-skeleton";

interface LibraryItem {
  id: string;
  source: "LIBRARY" | "WISHLIST";
  listeningProgress: number;
  personalRating: number | null;
  dateAdded: string;
  title: {
    asin: string;
    title: string;
    subtitle: string | null;
    authors: string[];
    narrators: string[];
    duration: number | null;
    coverImageUrl: string | null;
    rating: number | null;
  };
}

interface LibraryResponse {
  items: LibraryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export function LibraryContent() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchLibrary = useCallback(async (search: string) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (search) {
        params.set("search", search);
      }

      const response = await fetch(`/api/library?${params}`);

      if (!response.ok) {
        throw new Error("Failed to fetch library");
      }

      const data: LibraryResponse = await response.json();
      setItems(data.items);
    } catch (err) {
      console.error("Error fetching library:", err);
      setError(err instanceof Error ? err.message : "Failed to load library");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLibrary(searchQuery);
  }, [searchQuery, fetchLibrary]);

  if (loading && items.length === 0) {
    return (
      <div className="space-y-6">
        <SearchBar onSearch={setSearchQuery} />
        <LibrarySkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-center text-destructive">
        <p className="font-medium">Error loading library</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (items.length === 0 && !searchQuery) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6">
      <SearchBar onSearch={setSearchQuery} />

      {items.length === 0 && searchQuery ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <div className="mx-auto max-w-md space-y-2">
            <h3 className="text-lg font-semibold">No results found</h3>
            <p className="text-sm text-muted-foreground">
              Try a different search term or browse all titles
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {items.map((item) => (
            <TitlePosterCard
              key={item.id}
              asin={item.title.asin}
              title={item.title.title}
              authors={item.title.authors}
              coverImageUrl={item.title.coverImageUrl}
              duration={item.title.duration}
              rating={item.title.rating}
              source={item.source}
              listeningProgress={item.listeningProgress}
            />
          ))}
        </div>
      )}

      {loading && items.length > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          Loading...
        </div>
      )}
    </div>
  );
}
