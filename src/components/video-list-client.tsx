"use client";

import { useMemo, useState, useEffect } from 'react';
import { SortDropdown } from './sort-dropdown';
import { VideoCard } from './video-card';
import { Badge } from '@/components/ui/badge';
import type { VideoListItem } from '@/lib/nocodb';
import type { FilterOption } from '@/lib/filterVideos';
import { filterVideos } from '@/lib/filterVideos';
import { useRouter, useSearchParams } from 'next/navigation';
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


export function VideoListClient({ videos }: VideoListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedFilters, setSelectedFilters] = useState<FilterOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Initialize filters from URL on mount or when search params change
  useEffect(() => {
    const params = searchParams.getAll('f');
    if (params.length === 0) {
      if (selectedFilters.length !== 0) setSelectedFilters([]);
      return;
    }
    const parsed: FilterOption[] = params
      .map((p) => {
        const [type, ...rest] = p.split(':');
        const value = decodeURIComponent(rest.join(':'));
        if (!type || !value) return null;
        return { label: value, value, type } as FilterOption;
      })
      .filter(Boolean) as FilterOption[];
    const current = JSON.stringify(selectedFilters);
    const incoming = JSON.stringify(parsed);
    if (current !== incoming) {
      setSelectedFilters(parsed);
    }
  }, [searchParams, selectedFilters]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('f');
    selectedFilters.forEach((f) => {
      params.append('f', `${f.type}:${f.value}`);
    });
    const newQuery = params.toString();
    if (newQuery !== searchParams.toString()) {
      router.replace(`/?${newQuery}`, { scroll: false });
    }
  }, [selectedFilters, searchParams, router]);

  const allOptions = useMemo<FilterOption[]>(() => {
    const persons = new Set<string>();
    const companies = new Set<string>();
    const genres = new Set<string>();
    const indicators = new Set<string>();
    const trends = new Set<string>();
    const assets = new Set<string>();
    const tickers = new Set<string>();
    const institutions = new Set<string>();
    const events = new Set<string>();
    const dois = new Set<string>();
    const hashtags = new Set<string>();
    const mainTopics = new Set<string>();
    const primarySources = new Set<string>();
    const sentiments = new Set<string>();
    const sentimentReasons = new Set<string>();
    const channels = new Set<string>();
    const descriptions = new Set<string>();
    const technicalTerms = new Set<string>();
    const speakers = new Set<string>();
    videos.forEach((v) => {
      v.Persons?.forEach((p) => {
        const val = typeof p === 'string' ? p : p?.Title || p?.name || '';
        if (val) persons.add(val);
      });
      v.Companies?.forEach((c) => {
        const val = typeof c === 'string' ? c : c?.Title || c?.name || '';
        if (val) companies.add(val);
      });
      if (v.VideoGenre) {
        genres.add(v.VideoGenre);
      }
      v.Indicators?.forEach((i) => {
        const val = typeof i === 'string' ? i : i?.Title || i?.name || '';
        if (val) indicators.add(val);
      });
      v.Trends?.forEach((t) => {
        const val = typeof t === 'string' ? t : t?.Title || t?.name || '';
        if (val) trends.add(val);
      });
      v.InvestableAssets?.forEach((a) => {
        if (a) assets.add(a);
      });
      if (v.TickerSymbol) {
        tickers.add(v.TickerSymbol);
      }
      v.Institutions?.forEach((inst) => {
        const val = typeof inst === 'string' ? inst : inst?.Title || inst?.name || '';
        if (val) institutions.add(val);
      });
      v.EventsFairs?.forEach((e) => {
        if (e) events.add(e);
      });
      v.DOIs?.forEach((d) => {
        if (d) dois.add(d);
      });
      v.Hashtags?.forEach((h) => {
        if (h) hashtags.add(h);
      });
      if (v.MainTopic) {
        mainTopics.add(v.MainTopic);
      }
      v.PrimarySources?.forEach((p) => {
        if (p) primarySources.add(p);
      });
      if (v.Sentiment !== null && v.Sentiment !== undefined) {
        sentiments.add(String(v.Sentiment));
      }
      if (v.SentimentReason) {
        sentimentReasons.add(v.SentimentReason);
      }
      if (v.Channel) {
        channels.add(v.Channel);
      }
      if (v.Description) {
        descriptions.add(v.Description);
      }
      v.TechnicalTerms?.forEach((t) => {
        if (t) technicalTerms.add(t);
      });
      if (v.Speaker) {
        speakers.add(v.Speaker);
      }
    });
    return [
      ...Array.from(persons).map((p) => ({ label: p, value: p, type: 'person' as const })),
      ...Array.from(companies).map((c) => ({ label: c, value: c, type: 'company' as const })),
      ...Array.from(genres).map((g) => ({ label: g, value: g, type: 'genre' as const })),
      ...Array.from(indicators).map((i) => ({ label: i, value: i, type: 'indicator' as const })),
      ...Array.from(trends).map((t) => ({ label: t, value: t, type: 'trend' as const })),
      ...Array.from(assets).map((a) => ({ label: a, value: a, type: 'asset' as const })),
      ...Array.from(tickers).map((tk) => ({ label: tk, value: tk, type: 'ticker' as const })),
      ...Array.from(institutions).map((inst) => ({ label: inst, value: inst, type: 'institution' as const })),
      ...Array.from(events).map((ev) => ({ label: ev, value: ev, type: 'event' as const })),
      ...Array.from(dois).map((d) => ({ label: d, value: d, type: 'doi' as const })),
      ...Array.from(hashtags).map((h) => ({ label: h, value: h, type: 'hashtag' as const })),
      ...Array.from(mainTopics).map((m) => ({ label: m, value: m, type: 'mainTopic' as const })),
      ...Array.from(primarySources).map((ps) => ({ label: ps, value: ps, type: 'primarySource' as const })),
      ...Array.from(sentiments).map((s) => ({ label: s, value: s, type: 'sentiment' as const })),
      ...Array.from(sentimentReasons).map((sr) => ({ label: sr, value: sr, type: 'sentimentReason' as const })),
      ...Array.from(channels).map((c) => ({ label: c, value: c, type: 'channel' as const })),
      ...Array.from(descriptions).map((d) => ({ label: d, value: d, type: 'description' as const })),
      ...Array.from(technicalTerms).map((tt) => ({ label: tt, value: tt, type: 'technicalTerm' as const })),
      ...Array.from(speakers).map((sp) => ({ label: sp, value: sp, type: 'speaker' as const })),
    ];
  }, [videos]);

  const availableOptions = useMemo(() => {
    return allOptions.filter(
      (opt) =>
        !selectedFilters.some((f) => f.value === opt.value && f.type === opt.type) &&
        opt.label.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [allOptions, selectedFilters, searchTerm]);

  const filteredVideos = useMemo(() => filterVideos(videos, selectedFilters), [videos, selectedFilters]);

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
        {filteredVideos.map((video, index) => {
          const qs = searchParams.toString();
          const href = qs ? `/video/${video.VideoID}?${qs}` : `/video/${video.VideoID}`;
          return (
            <VideoCard key={video.Id} video={video} href={href} priority={index === 0} />
          );
        })}
      </div>
    </div>
  );
}
