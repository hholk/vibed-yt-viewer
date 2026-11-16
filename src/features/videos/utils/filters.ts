import type { VideoListItem } from '../api/nocodb';

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

// Simplified filter type definitions - only using fields available in VideoListItem
export type FilterType =
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

export interface FilterOption {
  label: string;
  value: string;
  type: FilterType;
}

// Configuration-driven filter getters - only using fields available in VideoListItem schema
export const FILTER_CONFIG: Record<FilterType, (v: VideoListItem) => string[]> = {
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

// URLSearchParams has already decoded each value. Never decode it a second time.
export function parseFilters(params: Pick<URLSearchParams, 'getAll'>): FilterOption[] {
  const seen = new Set<string>();
  return params.getAll('f').flatMap((raw) => {
    const separator = raw.indexOf(':');
    const type = raw.slice(0, separator);
    const value = raw.slice(separator + 1);
    if (separator < 1 || !value || !Object.hasOwn(FILTER_CONFIG, type) || seen.has(raw)) return [];
    seen.add(raw);
    return [{ type: type as FilterType, value, label: value }];
  });
}

export function withFilters(params: URLSearchParams, filters: FilterOption[]): URLSearchParams {
  const next = new URLSearchParams(params);
  next.delete('f');
  filters.forEach(({ type, value }) => next.append('f', `${type}:${value}`));
  return next;
}

export function filterVideos<T extends VideoListItem>(videos: T[], filters: FilterOption[]): T[] {
  return videos.filter(video => filters.every(filter => FILTER_CONFIG[filter.type](video).includes(filter.value)));
}
