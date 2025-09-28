"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Clock, TrendingUp } from 'lucide-react';
import { fetchAllVideos } from '@/features/videos/api/nocodb';
import type { VideoListItem } from '@/features/videos/api/nocodb';

interface SearchSuggestion {
  type: 'recent' | 'popular' | 'field';
  value: string;
  label: string;
  count?: number;
  field?: string;
}

interface SearchAutoCompleteProps {
  query: string;
  onSelect: (value: string, category: string) => void;
  categories: string[];
  recentSearches: string[];
  onAddRecentSearch: (search: string) => void;
}

export function SearchAutoComplete({
  query,
  onSelect,
  categories,
  recentSearches,
  onAddRecentSearch
}: SearchAutoCompleteProps) {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allVideos, setAllVideos] = useState<VideoListItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load all videos for field-based suggestions
  useEffect(() => {
    const loadVideos = async () => {
      try {
        setIsLoading(true);
        const videos = await fetchAllVideos({
          fields: ['Title', 'Channel', 'Hashtags', 'Persons', 'Companies', 'TechnicalTerms']
        });
        setAllVideos(videos);
      } catch (error) {
        console.error('Failed to load videos for autocomplete:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadVideos();
  }, []);

  // Generate suggestions based on query
  const generateSuggestions = useMemo(() => {
    if (!query.trim() || query.length < 2) {
      // Show recent searches when no query
      return [
        ...recentSearches.slice(0, 5).map(search => ({
          type: 'recent' as const,
          value: search,
          label: search,
        }))
      ];
    }

    const queryLower = query.toLowerCase();
    const newSuggestions: SearchSuggestion[] = [];

    // Add recent searches that match
    recentSearches
      .filter(search => search.toLowerCase().includes(queryLower))
      .slice(0, 3)
      .forEach(search => {
        newSuggestions.push({
          type: 'recent',
          value: search,
          label: search,
        });
      });

    // Extract terms from videos based on categories
    const fieldMap: Record<string, string[]> = {
      title: ['Title'],
      description: ['Description'],
      channel: ['Channel'],
      hashtag: ['Hashtags'],
      person: ['Persons'],
      company: ['Companies'],
      technical: ['TechnicalTerms'],
    };

    const fieldsToSearch = categories.length > 0
      ? categories.flatMap(cat => fieldMap[cat] || [])
      : Object.values(fieldMap).flat();

    const uniqueFields = Array.from(new Set(fieldsToSearch));

    // Get suggestions from video data
    const fieldSuggestions = new Map<string, { count: number; field: string }>();

    allVideos.forEach(video => {
      uniqueFields.forEach(field => {
        const value = video[field as keyof VideoListItem];
        if (value && typeof value === 'string') {
          const terms = value.toLowerCase().split(/[\s,;]+/).filter(term => term.length > 2);
          terms.forEach(term => {
            if (term.includes(queryLower)) {
              const key = `${field}:${term}`;
              const existing = fieldSuggestions.get(key);
              if (existing) {
                existing.count++;
              } else {
                fieldSuggestions.set(key, { count: 1, field });
              }
            }
          });
        } else if (Array.isArray(value)) {
          value.forEach(item => {
            if (typeof item === 'string' && item.toLowerCase().includes(queryLower)) {
              const key = `${field}:${item}`;
              const existing = fieldSuggestions.get(key);
              if (existing) {
                existing.count++;
              } else {
                fieldSuggestions.set(key, { count: 1, field });
              }
            } else if (typeof item === 'object' && item !== null && 'name' in item) {
              const name = (item as { name?: string; Title?: string }).name || (item as { name?: string; Title?: string }).Title;
              if (typeof name === 'string' && name.toLowerCase().includes(queryLower)) {
                const key = `${field}:${name}`;
                const existing = fieldSuggestions.get(key);
                if (existing) {
                  existing.count++;
                } else {
                  fieldSuggestions.set(key, { count: 1, field });
                }
              }
            }
          });
        }
      });
    });

    // Convert to suggestions and sort by count
    Array.from(fieldSuggestions.entries())
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 8)
      .forEach(([key, { count, field }]) => {
        const [, value] = key.split(':');
        newSuggestions.push({
          type: 'field',
          value,
          label: value,
          count,
          field,
        });
      });

    return newSuggestions;
  }, [query, allVideos, categories, recentSearches]);

  useEffect(() => {
    setSuggestions(generateSuggestions);
    setShowSuggestions(generateSuggestions.length > 0);
  }, [generateSuggestions]);

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (suggestion: SearchSuggestion) => {
    onSelect(suggestion.value, suggestion.field || 'title');
    onAddRecentSearch(suggestion.value);
    setShowSuggestions(false);
  };

  if (!showSuggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-64 overflow-y-auto"
    >
      <div className="p-2">
        {isLoading && (
          <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Loading suggestions...
          </div>
        )}

        {!isLoading && suggestions.map((suggestion, index) => (
          <button
            key={`${suggestion.type}-${suggestion.value}-${index}`}
            onClick={() => handleSelect(suggestion)}
            className="w-full flex items-center justify-between p-2 text-sm hover:bg-accent rounded-sm text-left"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {suggestion.type === 'recent' && <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
              {suggestion.type === 'popular' && <TrendingUp className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
              {suggestion.type === 'field' && <Search className="w-3 h-3 text-muted-foreground flex-shrink-0" />}

              <span className="truncate">{suggestion.label}</span>

              {suggestion.field && (
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
                  {suggestion.field}
                </span>
              )}
            </div>

            {suggestion.count && (
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {suggestion.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
