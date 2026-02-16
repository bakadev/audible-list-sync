"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { TitlePosterCard } from "./title-poster-card";
import { SearchBar } from "./search-bar";
import { EmptyState } from "./empty-state";
import { LibrarySkeleton } from "./library-skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type LibrarySource = "LIBRARY" | "WISHLIST" | "OTHER";

interface LibraryItem {
  id: string;
  source: LibrarySource;
  progress: number;
  userRating: number | null;
  updatedAt: string;
  title: {
    asin: string;
    title: string;
    subtitle: string | null;
    authors: string[];
    narrators: string[];
    runtimeLengthMin: number | null;
    image: string | null;
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
  const [activeTab, setActiveTab] = useState<LibrarySource>("LIBRARY");
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef<HTMLDivElement>(null);

  const fetchLibrary = useCallback(
    async (source: LibrarySource, search: string, pageNum: number, append = false) => {
      try {
        if (append) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }
        setError(null);

        const params = new URLSearchParams();
        params.set("source", source);
        params.set("page", pageNum.toString());
        params.set("limit", "24");
        if (search) {
          params.set("search", search);
        }

        const response = await fetch(`/api/library?${params}`);

        if (!response.ok) {
          throw new Error("Failed to fetch library");
        }

        const data: LibraryResponse = await response.json();

        if (append) {
          setItems((prev) => [...prev, ...data.items]);
        } else {
          setItems(data.items);
        }

        setHasMore(data.pagination.page < data.pagination.pages);
      } catch (err) {
        console.error("Error fetching library:", err);
        setError(err instanceof Error ? err.message : "Failed to load library");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  // Reset and fetch when tab or search changes
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchLibrary(activeTab, searchQuery, 1, false);
  }, [activeTab, searchQuery, fetchLibrary]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchLibrary(activeTab, searchQuery, nextPage, true);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loading, loadingMore, page, activeTab, searchQuery, fetchLibrary]);

  const renderContent = () => {
    if (loading && items.length === 0) {
      return <LibrarySkeleton />;
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

    if (items.length === 0 && searchQuery) {
      return (
        <div className="rounded-lg border bg-card p-12 text-center">
          <div className="mx-auto max-w-md space-y-2">
            <h3 className="text-lg font-semibold">No results found</h3>
            <p className="text-sm text-muted-foreground">
              Try a different search term or browse all titles
            </p>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {items.map((item) => (
            <TitlePosterCard
              key={item.id}
              asin={item.title.asin}
              title={item.title.title}
              authors={item.title.authors}
              coverImageUrl={item.title.image}
              duration={item.title.runtimeLengthMin}
              rating={item.title.rating}
              source={item.source}
              listeningProgress={item.progress}
            />
          ))}
        </div>

        {/* Infinite scroll trigger */}
        <div ref={observerTarget} className="h-10 w-full" />

        {loadingMore && (
          <div className="text-center text-sm text-muted-foreground py-4">
            Loading more...
          </div>
        )}

        {!hasMore && items.length > 0 && (
          <div className="text-center text-sm text-muted-foreground py-4">
            No more items to load
          </div>
        )}
      </>
    );
  };

  return (
    <div className="space-y-6">
      <SearchBar onSearch={setSearchQuery} />

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as LibrarySource)}>
        <TabsList>
          <TabsTrigger value="LIBRARY">Library</TabsTrigger>
          <TabsTrigger value="WISHLIST">Wishlist</TabsTrigger>
          <TabsTrigger value="OTHER">Other</TabsTrigger>
        </TabsList>

        <TabsContent value="LIBRARY" className="mt-6">
          {renderContent()}
        </TabsContent>

        <TabsContent value="WISHLIST" className="mt-6">
          {renderContent()}
        </TabsContent>

        <TabsContent value="OTHER" className="mt-6">
          {renderContent()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
