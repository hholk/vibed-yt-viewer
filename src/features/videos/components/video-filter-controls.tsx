'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import type { VideoListItem } from '../api/nocodb';
import { FILTER_CONFIG, parseFilters, withFilters, type FilterOption, type FilterType } from '../utils/filters';

/** Exact, shareable filters over the loaded results; free-text search remains separate. */
export function VideoFilterControls({ videos }: { videos: VideoListItem[] }) {
  const params = useSearchParams();
  const selected = parseFilters(params);
  const [query, setQuery] = useState('');
  const options = useMemo(() => {
    const options = new Map<string, FilterOption>();
    for (const video of videos) {
      for (const [type, getter] of Object.entries(FILTER_CONFIG)) {
        for (const value of getter(video)) {
          if (value) options.set(`${type}:${value}`, { type: type as FilterType, value, label: value });
        }
      }
    }
    return Array.from(options.values());
  }, [videos]);
  function update(filters: FilterOption[]) {
    const next = withFilters(new URLSearchParams(window.location.search), filters).toString();
    window.history.replaceState(null, '', `${window.location.pathname}${next ? `?${next}` : ''}${window.location.hash}`);
  }
  return <div className="space-y-2">
    <div className="flex flex-wrap gap-2">
      {selected.map(filter => <Badge key={`${filter.type}:${filter.value}`} variant="secondary">
        {filter.label}
        <button type="button" aria-label={`Remove ${filter.label} filter`} onClick={() => update(parseFilters(new URLSearchParams(window.location.search)).filter(f => f.type !== filter.type || f.value !== filter.value))}><X className="ml-1 h-3 w-3" /></button>
      </Badge>)}
    </div>
    <input className="w-full rounded-md border bg-background px-2 py-1 text-sm" aria-label="Filter loaded videos" placeholder="Filter loaded videos..." value={query} onChange={event => setQuery(event.target.value)} />
    {query && <div className="max-h-48 overflow-y-auto rounded-md border bg-popover">
      {options.filter(option => option.label.toLowerCase().includes(query.toLowerCase()) && !selected.some(f => f.type === option.type && f.value === option.value)).map(option => <button type="button" key={`${option.type}:${option.value}`} className="block w-full px-2 py-1 text-left hover:bg-accent" onClick={() => {
        update([...parseFilters(new URLSearchParams(window.location.search)), option]);
        setQuery('');
      }}>{option.type}: {option.label}</button>)}
    </div>}
  </div>;
}
