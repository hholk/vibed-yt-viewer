import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

import type { FilterOption, FilterType } from '@/types/filters';
import type { VideoListItem } from '@/lib/nocodb';

export function serializeFilters(filters: Pick<FilterOption, 'type' | 'value'>[]): string {
  return filters
    .map((f) => `${encodeURIComponent(f.type)}:${encodeURIComponent(f.value)}`)
    .join('|');
}

export function deserializeFilters(str: string | null | undefined): Pick<FilterOption, 'type' | 'value'>[] {
  if (!str) return [];
  return str.split('|').map((part) => {
    const [type, ...valueParts] = part.split(':');
    const value = valueParts.join(':');
    return { type: decodeURIComponent(type) as FilterType, value: decodeURIComponent(value) };
  });
}

export function filterVideosByOptions(
  videos: VideoListItem[],
  filters: Pick<FilterOption, 'type' | 'value'>[],
): VideoListItem[] {
  if (filters.length === 0) return videos;
  return videos.filter((v) =>
    filters.every((f) => {
      switch (f.type) {
        case 'person':
          return v.Persons?.some((p) => (typeof p === 'string' ? p : p?.Title || p?.name) === f.value);
        case 'company':
          return v.Companies?.some((c) => (typeof c === 'string' ? c : c?.Title || c?.name) === f.value);
        case 'genre':
          return v.VideoGenre === f.value;
        case 'indicator':
          return v.Indicators?.some((i) => (typeof i === 'string' ? i : i?.Title || i?.name) === f.value);
        case 'trend':
          return v.Trends?.some((t) => (typeof t === 'string' ? t : t?.Title || t?.name) === f.value);
        case 'asset':
          return v.InvestableAssets?.includes(f.value);
        case 'ticker':
          return v.TickerSymbol === f.value;
        case 'institution':
          return v.Institutions?.some((inst) => (typeof inst === 'string' ? inst : inst?.Title || inst?.name) === f.value);
        case 'event':
          return v.EventsFairs?.includes(f.value);
        case 'doi':
          return v.DOIs?.includes(f.value);
        case 'hashtag':
          return v.Hashtags?.includes(f.value);
        case 'mainTopic':
          return v.MainTopic === f.value;
        case 'primarySource':
          return v.PrimarySources?.includes(f.value);
        case 'sentiment':
          return String(v.Sentiment ?? '') === f.value;
        case 'sentimentReason':
          return v.SentimentReason === f.value;
        case 'channel':
          return v.Channel === f.value;
        case 'description':
          return v.Description === f.value;
        case 'technicalTerm':
          return v.TechnicalTerms?.includes(f.value);
        case 'speaker':
          return v.Speaker === f.value;
        default:
          return true;
      }
    }),
  );
}
