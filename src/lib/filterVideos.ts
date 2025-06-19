export interface FilterOption {
  label: string;
  value: string;
  type:
    | 'person'
    | 'company'
    | 'genre'
    | 'indicator'
    | 'trend'
    | 'asset'
    | 'ticker'
    | 'institution'
    | 'event'
    | 'doi'
    | 'hashtag'
    | 'mainTopic'
    | 'primarySource'
    | 'sentiment'
    | 'sentimentReason'
    | 'channel'
    | 'description'
    | 'technicalTerm'
    | 'speaker';
}

import type { VideoListItem } from '@/lib/nocodb';

/**
 * Filter a list of videos based on selected filter options.
 */
export function filterVideos<T extends VideoListItem>(videos: T[], selectedFilters: FilterOption[]): T[] {
  if (!selectedFilters.length) return videos;
  return videos.filter((v) => {
    return selectedFilters.every((f) => {
      if (f.type === 'person') {
        return v.Persons?.some((p) => (typeof p === 'string' ? p : p?.Title || p?.name) === f.value);
      }
      if (f.type === 'company') {
        return v.Companies?.some((c) => (typeof c === 'string' ? c : c?.Title || c?.name) === f.value);
      }
      if (f.type === 'genre') {
        return v.VideoGenre === f.value;
      }
      if (f.type === 'indicator') {
        return v.Indicators?.some((i) => (typeof i === 'string' ? i : i?.Title || i?.name) === f.value);
      }
      if (f.type === 'trend') {
        return v.Trends?.some((t) => (typeof t === 'string' ? t : t?.Title || t?.name) === f.value);
      }
      if (f.type === 'asset') {
        return v.InvestableAssets?.includes(f.value);
      }
      if (f.type === 'ticker') {
        return v.TickerSymbol === f.value;
      }
      if (f.type === 'institution') {
        return v.Institutions?.some((inst) => (typeof inst === 'string' ? inst : inst?.Title || inst?.name) === f.value);
      }
      if (f.type === 'event') {
        return v.EventsFairs?.includes(f.value);
      }
      if (f.type === 'doi') {
        return v.DOIs?.includes(f.value);
      }
      if (f.type === 'hashtag') {
        return v.Hashtags?.includes(f.value);
      }
      if (f.type === 'mainTopic') {
        return v.MainTopic === f.value;
      }
      if (f.type === 'primarySource') {
        return v.PrimarySources?.includes(f.value);
      }
      if (f.type === 'sentiment') {
        return String(v.Sentiment ?? '') === f.value;
      }
      if (f.type === 'sentimentReason') {
        return v.SentimentReason === f.value;
      }
      if (f.type === 'channel') {
        return v.Channel === f.value;
      }
      if (f.type === 'description') {
        return v.Description === f.value;
      }
      if (f.type === 'technicalTerm') {
        return v.TechnicalTerms?.includes(f.value);
      }
      if (f.type === 'speaker') {
        return v.Speaker === f.value;
      }
      return true;
    });
  });
}
