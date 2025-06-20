"use client";

import { useMemo, useState } from "react";
import { SortDropdown } from "./sort-dropdown";
import { VideoCard } from "./video-card";
import { Badge } from "@/components/ui/badge";
import type { VideoListItem } from "@/lib/nocodb";
import { X } from "lucide-react";

const extractTitles = (
  items?: (string | { Title?: string | null; name?: string | null })[] | null,
): string[] =>
  (items ?? []).map((i) =>
    typeof i === "string" ? i : i?.Title || i?.name || "",
  );

const linkedGetter = (key: keyof VideoListItem) => (v: VideoListItem) =>
  extractTitles((v as any)[key]);

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
}

type FilterType =
  | "person"
  | "company"
  | "genre"
  | "indicator"
  | "trend"
  | "asset"
  | "ticker"
  | "institution"
  | "event"
  | "doi"
  | "hashtag"
  | "mainTopic"
  | "primarySource"
  | "sentiment"
  | "sentimentReason"
  | "channel"
  | "description"
  | "technicalTerm"
  | "speaker";

interface FilterOption {
  label: string;
  value: string;
  type: FilterType;
}

const FILTER_GETTERS: Record<FilterType, (v: VideoListItem) => string[]> = {
  person: linkedGetter("Persons"),
  company: linkedGetter("Companies"),
  genre: (v) => (v.VideoGenre ? [v.VideoGenre] : []),
  indicator: linkedGetter("Indicators"),
  trend: linkedGetter("Trends"),
  asset: (v) => v.InvestableAssets ?? [],
  ticker: (v) => (v.TickerSymbol ? [v.TickerSymbol] : []),
  institution: linkedGetter("Institutions"),
  event: (v) => v.EventsFairs ?? [],
  doi: (v) => v.DOIs ?? [],
  hashtag: (v) => v.Hashtags ?? [],
  mainTopic: (v) => (v.MainTopic ? [v.MainTopic] : []),
  primarySource: (v) => v.PrimarySources ?? [],
  sentiment: (v) =>
    v.Sentiment !== null && v.Sentiment !== undefined
      ? [String(v.Sentiment)]
      : [],
  sentimentReason: (v) => (v.SentimentReason ? [v.SentimentReason] : []),
  channel: (v) => (v.Channel ? [v.Channel] : []),
  description: (v) => (v.Description ? [v.Description] : []),
  technicalTerm: (v) => v.TechnicalTerms ?? [],
  speaker: (v) => (v.Speaker ? [v.Speaker] : []),
};

export function VideoListClient({ videos }: VideoListClientProps) {
  const [selectedFilters, setSelectedFilters] = useState<FilterOption[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const allOptions = useMemo<FilterOption[]>(() => {
    const sets: Record<FilterType, Set<string>> = {} as Record<
      FilterType,
      Set<string>
    >;
    (Object.keys(FILTER_GETTERS) as FilterType[]).forEach(
      (t) => (sets[t] = new Set()),
    );
    videos.forEach((v) => {
      (
        Object.entries(FILTER_GETTERS) as [
          FilterType,
          (v: VideoListItem) => string[],
        ][]
      ).forEach(([type, getter]) => {
        getter(v).forEach((val) => val && sets[type].add(val));
      });
    });
    return (Object.entries(sets) as [FilterType, Set<string>][]).flatMap(
      ([type, set]) =>
        Array.from(set).map((value) => ({ label: value, value, type })),
    );
  }, [videos]);

  const availableOptions = useMemo(() => {
    return allOptions.filter(
      (opt) =>
        !selectedFilters.some(
          (f) => f.value === opt.value && f.type === opt.type,
        ) && opt.label.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [allOptions, selectedFilters, searchTerm]);

  const filteredVideos = useMemo(() => {
    if (selectedFilters.length === 0) return videos;
    return videos.filter((v) =>
      selectedFilters.every((f) => FILTER_GETTERS[f.type](v).includes(f.value)),
    );
  }, [videos, selectedFilters]);

  const addFilter = (opt: FilterOption) => {
    setSelectedFilters((prev) => [...prev, opt]);
    setSearchTerm("");
  };

  const removeFilter = (index: number) => {
    setSelectedFilters((prev) => prev.filter((_, i) => i !== index));
  };

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
    </div>
  );
}
