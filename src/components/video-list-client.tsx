"use client";

import { useMemo, useState } from 'react';
import { SortDropdown } from './sort-dropdown';
import { VideoCard } from './video-card';
import { Badge } from '@/components/ui/badge';
import type { VideoListItem } from '@/lib/nocodb';
import { X } from 'lucide-react';

interface VideoListClientProps {
  videos: (VideoListItem & {
    Persons?: (string | { Title?: string | null; name?: string | null })[] | null;
    Companies?: (string | { Title?: string | null; name?: string | null })[] | null;
    Indicators?: (string | { Title?: string | null; name?: string | null })[] | null;
    Trends?: (string | { Title?: string | null; name?: string | null })[] | null;
    Institutions?: (string | { Title?: string | null; name?: string | null })[] | null;
  })[];
}

interface FilterOption {
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

export function VideoListClient({ videos }: VideoListClientProps) {
  const [selectedFilters, setSelectedFilters] = useState<FilterOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const filterConfig: Array<{
    type: FilterOption['type'];
    get: (v: VideoListItem) => string[];
  }> = [
    { type: 'person', get: v => (v.Persons ?? []).map(p => typeof p === 'string' ? p : p?.Title || p?.name || '') },
    { type: 'company', get: v => (v.Companies ?? []).map(c => typeof c === 'string' ? c : c?.Title || c?.name || '') },
    { type: 'genre', get: v => v.VideoGenre ? [v.VideoGenre] : [] },
    { type: 'indicator', get: v => (v.Indicators ?? []).map(i => typeof i === 'string' ? i : i?.Title || i?.name || '') },
    { type: 'trend', get: v => (v.Trends ?? []).map(t => typeof t === 'string' ? t : t?.Title || t?.name || '') },
    { type: 'asset', get: v => v.InvestableAssets ?? [] },
    { type: 'ticker', get: v => v.TickerSymbol ? [v.TickerSymbol] : [] },
    { type: 'institution', get: v => (v.Institutions ?? []).map(inst => typeof inst === 'string' ? inst : inst?.Title || inst?.name || '') },
    { type: 'event', get: v => v.EventsFairs ?? [] },
    { type: 'doi', get: v => v.DOIs ?? [] },
    { type: 'hashtag', get: v => v.Hashtags ?? [] },
    { type: 'mainTopic', get: v => v.MainTopic ? [v.MainTopic] : [] },
    { type: 'primarySource', get: v => v.PrimarySources ?? [] },
    { type: 'sentiment', get: v => v.Sentiment !== null && v.Sentiment !== undefined ? [String(v.Sentiment)] : [] },
    { type: 'sentimentReason', get: v => v.SentimentReason ? [v.SentimentReason] : [] },
    { type: 'channel', get: v => v.Channel ? [v.Channel] : [] },
    { type: 'description', get: v => v.Description ? [v.Description] : [] },
    { type: 'technicalTerm', get: v => v.TechnicalTerms ?? [] },
    { type: 'speaker', get: v => v.Speaker ? [v.Speaker] : [] },
  ];

  const allOptions = useMemo<FilterOption[]>(() => {
    const sets = filterConfig.reduce((acc, f) => {
      acc[f.type] = new Set<string>();
      return acc;
    }, {} as Record<FilterOption['type'], Set<string>>);

    videos.forEach(v => {
      filterConfig.forEach(cfg => {
        cfg.get(v).forEach(val => val && sets[cfg.type].add(val));
      });
    });

    return filterConfig.flatMap(cfg =>
      Array.from(sets[cfg.type]).map(value => ({ label: value, value, type: cfg.type }))
    );
  }, [videos]);

  const availableOptions = useMemo(() => {
    return allOptions.filter(
      (opt) =>
        !selectedFilters.some((f) => f.value === opt.value && f.type === opt.type) &&
        opt.label.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [allOptions, selectedFilters, searchTerm]);

  const predicateMap: Record<FilterOption['type'], (v: VideoListItem, value: string) => boolean> = {
    person: (v, val) => v.Persons?.some(p => (typeof p === 'string' ? p : p?.Title || p?.name) === val) ?? false,
    company: (v, val) => v.Companies?.some(c => (typeof c === 'string' ? c : c?.Title || c?.name) === val) ?? false,
    genre: (v, val) => v.VideoGenre === val,
    indicator: (v, val) => v.Indicators?.some(i => (typeof i === 'string' ? i : i?.Title || i?.name) === val) ?? false,
    trend: (v, val) => v.Trends?.some(t => (typeof t === 'string' ? t : t?.Title || t?.name) === val) ?? false,
    asset: (v, val) => v.InvestableAssets?.includes(val) ?? false,
    ticker: (v, val) => v.TickerSymbol === val,
    institution: (v, val) => v.Institutions?.some(inst => (typeof inst === 'string' ? inst : inst?.Title || inst?.name) === val) ?? false,
    event: (v, val) => v.EventsFairs?.includes(val) ?? false,
    doi: (v, val) => v.DOIs?.includes(val) ?? false,
    hashtag: (v, val) => v.Hashtags?.includes(val) ?? false,
    mainTopic: (v, val) => v.MainTopic === val,
    primarySource: (v, val) => v.PrimarySources?.includes(val) ?? false,
    sentiment: (v, val) => String(v.Sentiment ?? '') === val,
    sentimentReason: (v, val) => v.SentimentReason === val,
    channel: (v, val) => v.Channel === val,
    description: (v, val) => v.Description === val,
    technicalTerm: (v, val) => v.TechnicalTerms?.includes(val) ?? false,
    speaker: (v, val) => v.Speaker === val,
  };

  const filteredVideos = useMemo(() => {
    if (selectedFilters.length === 0) return videos;
    return videos.filter(v =>
      selectedFilters.every(f => predicateMap[f.type](v, f.value))
    );
  }, [videos, selectedFilters]);

  const addFilter = (opt: FilterOption) => {
    setSelectedFilters((prev) => [...prev, opt]);
    setSearchTerm('');
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
              <Badge key={i} variant="secondary" className="flex items-center gap-1">
                {f.label}
                <button type="button" onClick={() => removeFilter(i)} aria-label="Remove filter">
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
                    <span className="mr-2 text-xs uppercase text-muted-foreground">{opt.type}</span>
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
