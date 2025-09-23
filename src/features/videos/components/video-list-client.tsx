"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { SortDropdown } from "./sort-dropdown";
import { VideoCard } from "./video-card";
import { Badge } from "@/shared/components/ui/badge";
import type { VideoListItem } from "@/features/videos/api/nocodb";
import { X, Loader2 } from "lucide-react";
import type { PageInfo } from "@/features/videos/api/nocodb";

/**
 * Utility functions for extracting filterable data from videos
 */

// Extract titles from arrays of strings or objects
function extractTitles(
  items?: (string | { Title?: string | null; name?: string | null })[] | null
): string[] {
  if (!items) return [];
  return items.map((i) => {
    if (typeof i === "string") return i;
    if (typeof i === "object" && i !== null) {
      return ("Title" in i && i.Title) ? i.Title : ("name" in i && i.name) ? i.name ?? "" : "";
    }
    return "";
  });
}

// Generic getter for linked record fields
function linkedGetter(key: keyof VideoListItem) {
  return (v: VideoListItem): string[] => {
    const value = v[key] as unknown;
    if (Array.isArray(value)) {
      return extractTitles(value as (string | { Title?: string | null; name?: string | null })[]);
    }
    if (typeof value === "string") {
      return [value];
    }
    return [];
  };
}

// Generic getter for simple string/number fields
function simpleGetter<T>(key: keyof VideoListItem, transform?: (value: T) => string) {
  return (v: VideoListItem): string[] => {
    const value = v[key];
    if (value == null) return [];
    const transformed = transform ? transform(value as T) : String(value);
    return [transformed];
  };
}

interface VideoListClientProps {
  videos: (VideoListItem & {
    Persons?:
      | (string | { Title?: string | null; name?: string | null })[]
      | null;
    Companies?:
      | (string | { Title?: string | null; name?: string | null })[]
      | null;
    Indicators?:
      | (string | { Title?: string | null; name?: string | null })[]
      | null;
    Trends?:
      | (string | { Title?: string | null; name?: string | null })[]
      | null;
    Institutions?:
      | (string | { Title?: string | null; name?: string | null })[]
      | null;
  })[];
  pageInfo?: PageInfo | null;
  initialSort?: string;
}

// Simplified filter type definitions - only using fields available in VideoListItem
type FilterType =
  | "person"
  | "company"
  | "genre"
  | "indicator"
  | "trend"
  | "asset"
  | "institution"
  | "event"
  | "doi"
  | "hashtag"
  | "primarySource"
  | "sentiment"
  | "channel"
  | "description"
  | "technicalTerm"
  | "speaker";

interface FilterOption {
  label: string;
  value: string;
  type: FilterType;
}

// Configuration-driven filter getters - only using fields available in VideoListItem schema
const FILTER_CONFIG: Record<FilterType, (v: VideoListItem) => string[]> = {
  person: linkedGetter("Persons"),
  company: linkedGetter("Companies"),
  genre: simpleGetter("VideoGenre"),
  indicator: linkedGetter("Indicators"),
  trend: linkedGetter("Trends"),
  asset: (v: VideoListItem) => v.InvestableAssets ?? [],
  institution: linkedGetter("Institutions"),
  event: (v: VideoListItem) => v.EventsFairs ?? [],
  doi: (v: VideoListItem) => v.DOIs ?? [],
  hashtag: (v: VideoListItem) => v.Hashtags ?? [],
  primarySource: (v: VideoListItem) => v.PrimarySources ?? [],
  sentiment: (v: VideoListItem) =>
    v.Sentiment !== null && v.Sentiment !== undefined
      ? [String(v.Sentiment)]
      : [],
  channel: simpleGetter("Channel"),
  description: simpleGetter("Description"),
  technicalTerm: (v: VideoListItem) => v.TechnicalTerms ?? [],
  speaker: simpleGetter("Speaker"),
};

export function VideoListClient({ videos, pageInfo, initialSort }: VideoListClientProps) {
  const [selectedFilters, setSelectedFilters] = useState<FilterOption[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [allVideos, setAllVideos] = useState(videos);
  const [currentPage, setCurrentPage] = useState(2); // Start from page 2 since we already have page 1
  const [hasNextPage, setHasNextPage] = useState(pageInfo?.hasNextPage || false);
  const [totalRows, setTotalRows] = useState(pageInfo?.totalRows || 0);
  const loadingRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);

  // Calculate if there might be more pages based on loaded videos vs total rows
  const mightHaveMorePages = totalRows > 0 && allVideos.length < totalRows;

  // Use either hasNextPage from API or our calculation
  const shouldShowLoadingIndicator = hasNextPage || mightHaveMorePages;

  // Auto-trigger loading if we detect there are more pages available
  useEffect(() => {
    if (mightHaveMorePages && !isLoadingRef.current && allVideos.length > 0) {
      console.log('Auto-triggering load more due to detected additional pages');
      // Don't auto-load immediately, let user scroll first
    }
  }, [mightHaveMorePages, allVideos.length]);

  // Generate all available filter options
  const allOptions = useMemo<FilterOption[]>(() => {
    const filterValues = new Map<FilterType, Set<string>>();

    // Initialize sets for all filter types
    Object.keys(FILTER_CONFIG).forEach(type => {
      filterValues.set(type as FilterType, new Set());
    });

    // Extract values from all videos
    allVideos.forEach((video) => {
      Object.entries(FILTER_CONFIG).forEach(([type, getter]) => {
        getter(video).forEach((value) => {
          if (value) filterValues.get(type as FilterType)!.add(value);
        });
      });
    });

    // Convert to filter options
    return Array.from(filterValues.entries()).flatMap(([type, values]) =>
      Array.from(values).map((value) => ({ label: value, value, type: type as FilterType }))
    );
  }, [allVideos]);

  // Filter available options based on search term and selected filters
  const availableOptions = useMemo(() => {
    return allOptions.filter(
      (opt) =>
        !selectedFilters.some(
          (f) => f.value === opt.value && f.type === opt.type,
        ) && opt.label.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [allOptions, selectedFilters, searchTerm]);

  // Filter videos based on selected filters
  const filteredVideos = useMemo(() => {
    if (selectedFilters.length === 0) return allVideos;
    return allVideos.filter((video) =>
      selectedFilters.every((filter) => FILTER_CONFIG[filter.type](video).includes(filter.value)),
    );
  }, [allVideos, selectedFilters]);

  const addFilter = (opt: FilterOption) => {
    setSelectedFilters((prev) => [...prev, opt]);
    setSearchTerm("");
  };

  const removeFilter = (index: number) => {
    setSelectedFilters((prev) => prev.filter((_, i) => i !== index));
  };

  const loadMoreVideos = useCallback(async () => {
    if (isLoadingRef.current) {
      console.log('Load more already in progress, skipping');
      return;
    }

    console.log('🚀 Starting load more videos, current state:', {
      currentPage,
      hasNextPage,
      totalRows,
      loadedVideos: allVideos.length,
      isLoading: isLoadingRef.current
    });

    isLoadingRef.current = true;

    try {
      const response = await fetch(`/api/videos?page=${currentPage}&limit=25&sort=${initialSort || '-CreatedAt'}`);
      const data = await response.json();

      console.log('📡 API Response received:', {
        success: data.success,
        videosCount: data.videos?.length || 0,
        pageInfo: data.pageInfo,
        error: data.error
      });

      if (data.success && data.videos && data.videos.length > 0) {
        console.log('✅ Adding videos to state');
        setAllVideos(prev => {
          const newVideos = [...prev, ...data.videos];
          console.log(`📈 Updated videos count: ${prev.length} -> ${newVideos.length}`);
          return newVideos;
        });
        setCurrentPage(prev => {
          const newPage = prev + 1;
          console.log(`📄 Updated page: ${prev} -> ${newPage}`);
          return newPage;
        });
        setHasNextPage(data.pageInfo?.hasNextPage || false);
        setTotalRows(data.pageInfo?.totalRows || totalRows);
        console.log('🎉 Load more completed successfully');
      } else {
        console.log('❌ No videos returned or API error:', data.error);
        setHasNextPage(false);
      }
    } catch (error) {
      console.error('💥 Error in loadMoreVideos:', error);
    } finally {
      console.log('🏁 Load more completed, setting loading to false');
      isLoadingRef.current = false;
    }
  }, [currentPage, initialSort, totalRows, allVideos.length, hasNextPage]);

  // Infinite scroll implementation
  useEffect(() => {
    const handleScroll = () => {
      if (!loadingRef.current || isLoadingRef.current) {
        return;
      }

      const rect = loadingRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const isNearBottom = rect.top <= windowHeight + 400; // Trigger even earlier (400px before loading indicator reaches bottom)

      console.log('🔍 Scroll check:', {
        rectTop: rect.top,
        windowHeight,
        isNearBottom,
        loadingIndicatorVisible: shouldShowLoadingIndicator,
        isLoading: isLoadingRef.current,
        // Show how much content is left below the loading indicator
        contentBelow: rect.top - windowHeight
      });

      if (isNearBottom && shouldShowLoadingIndicator) {
        console.log('🎯 Triggering load more videos via scroll (early trigger)');
        loadMoreVideos();
      }
    };

    console.log('📏 Setting up scroll listener, loading indicator should be:', shouldShowLoadingIndicator);
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Also check on initial load in case loading indicator is already visible
    if (shouldShowLoadingIndicator && loadingRef.current) {
      const rect = loadingRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const isNearBottom = rect.top <= windowHeight + 400;
      if (isNearBottom) {
        console.log('🚀 Initial load trigger - loading indicator is visible (early trigger)');
        loadMoreVideos();
      }
    }

    return () => {
      console.log('🧹 Cleaning up scroll listener');
      window.removeEventListener('scroll', handleScroll);
    };
  }, [loadMoreVideos, shouldShowLoadingIndicator]);

  return (
    <div>
      <div className="flex justify-between items-start mb-6 gap-4">
        <div className="flex flex-col gap-2 w-full max-w-sm">
          <div className="flex flex-wrap gap-2">
            {selectedFilters.map((f, i) => (
              <Badge
                key={i}
                variant="secondary"
                className="flex items-center gap-1"
              >
                {f.label}
                <button
                  type="button"
                  onClick={() => removeFilter(i)}
                  aria-label="Remove filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search filters..."
              className="w-full rounded-md border bg-background px-2 py-1 text-sm"
            />
            {searchTerm && availableOptions.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow">
                {availableOptions.map((opt) => (
                  <div
                    key={`${opt.type}-${opt.value}`}
                    className="cursor-pointer px-2 py-1 hover:bg-accent"
                    onClick={() => addFilter(opt)}
                  >
                    <span className="mr-2 text-xs uppercase text-muted-foreground">
                      {opt.type}
                    </span>
                    {opt.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <SortDropdown />
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
        {filteredVideos.map((video, index) => (
          <VideoCard key={video.Id} video={video} priority={index === 0} />
        ))}
      </div>

      {/* Infinite scroll loading indicator */}
      {shouldShowLoadingIndicator && (
        <div
          ref={loadingRef}
          className="flex justify-center items-center py-8"
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading more videos...</span>
          </div>
        </div>
      )}

      {/* End of content message */}
      {!shouldShowLoadingIndicator && allVideos.length >= 25 && (
        <div className="flex justify-center py-8">
          <p className="text-muted-foreground">You&apos;ve reached the end of the video collection</p>
        </div>
      )}
    </div>
  );
}
