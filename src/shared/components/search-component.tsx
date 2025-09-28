"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Search, Tag, Filter, X, Loader2 } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { VideoCard } from '@/features/videos/components/video-card';
import type { VideoListItem } from "@/features/videos/api/nocodb";

interface SearchTag {
  id: string;
  value: string;
  category: string;
  label: string;
}

interface SearchComponentProps {
  initialVideos?: VideoListItem[];
  className?: string;
}

const SEARCH_CATEGORIES = [
  { key: 'title', label: 'Title', icon: '📝' },
  { key: 'description', label: 'Description', icon: '📄' },
  { key: 'channel', label: 'Channel', icon: '📺' },
  { key: 'speaker', label: 'Speaker', icon: '🎤' },
  { key: 'genre', label: 'Genre', icon: '🎭' },
  { key: 'topic', label: 'Topic', icon: '🏷️' },
  { key: 'hashtag', label: 'Hashtag', icon: '#' },
  { key: 'person', label: 'Person', icon: '👤' },
  { key: 'company', label: 'Company', icon: '🏢' },
  { key: 'indicator', label: 'Indicator', icon: '📊' },
  { key: 'trend', label: 'Trend', icon: '📈' },
  { key: 'asset', label: 'Asset', icon: '💰' },
  { key: 'institution', label: 'Institution', icon: '🏛️' },
  { key: 'event', label: 'Event', icon: '📅' },
  { key: 'doi', label: 'DOI', icon: '🔗' },
  { key: 'source', label: 'Source', icon: '📚' },
  { key: 'technical', label: 'Technical', icon: '⚙️' },
  { key: 'ticker', label: 'Ticker', icon: '📊' },
];

export function SearchComponent({ initialVideos = [] }: SearchComponentProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTags, setSearchTags] = useState<SearchTag[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<VideoListItem[]>(initialVideos); // Initialize with initialVideos
  const [isSearching, setIsSearching] = useState(false);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(initialVideos.length >= 35); // Assume more if we got a full page
  const [totalResults, setTotalResults] = useState(0);
  const loadingRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);

  // Generate unique ID for tags
  const generateTagId = useCallback(() => {
    return `tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Add a search tag
  const addSearchTag = useCallback((value: string, category: string) => {
    if (!value.trim()) return;

    const categoryInfo = SEARCH_CATEGORIES.find(cat => cat.key === category);
    const label = categoryInfo ? `${categoryInfo.icon} ${value}` : value;

    const newTag: SearchTag = {
      id: generateTagId(),
      value: value.trim(),
      category,
      label,
    };

    setSearchTags(prev => [...prev, newTag]);
    setSearchQuery("");
    setShowCategorySelector(false);
  }, [generateTagId]);

  // Remove a search tag
  const removeSearchTag = useCallback((tagId: string) => {
    setSearchTags(prev => prev.filter(tag => tag.id !== tagId));
  }, []);

  // Toggle category selection
  const toggleCategory = useCallback((category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  }, []);

  // Clear all search tags
  const clearAllTags = useCallback(() => {
    setSearchTags([]);
    setSelectedCategories([]);
    setSearchResults([]);
    setCurrentPage(1);
    setHasNextPage(true);
    setTotalResults(0);
  }, []);

  // Perform search
  const performSearch = useCallback(async (isLoadMore = false) => {
    if (searchTags.length === 0) {
      // Show all videos when no search tags - only load more, don't replace existing
      if (isLoadMore && isLoadingRef.current) {
        return;
      }

      isLoadingRef.current = true;

      try {
        const page = currentPage; // Use current page number, not currentPage + 1
        const response = await fetch(`/api/videos?page=${page}&limit=35&sort=-CreatedAt`);
        const data = await response.json();

        if (data.success && data.videos && data.videos.length > 0) {
          setSearchResults(prev => {
            // Remove any potential duplicates by filtering out videos that already exist
            const existingIds = new Set(prev.map(v => v.Id));
            const newVideos = data.videos.filter((v: VideoListItem) => !existingIds.has(v.Id));
            return [...prev, ...newVideos];
          });
          setCurrentPage(prev => prev + 1); // Increment after successful load
          setHasNextPage(data.pageInfo?.hasNextPage ?? false);
          setTotalResults(data.pageInfo?.totalRows || 0);
        } else {
          setHasNextPage(false);
        }
      } catch (error) {
        console.error('Error loading videos:', error);
        setHasNextPage(false);
      } finally {
        isLoadingRef.current = false;
      }
      return;
    }

    // Handle search case
    if (isLoadMore && isLoadingRef.current) {
      return;
    }

    isLoadingRef.current = true;
    if (!isLoadMore) {
      setIsSearching(true);
      setCurrentPage(1); // Start from page 1 for new searches
    }

    try {
      const query = searchTags.map(tag => tag.value).join(' ');
      const categories = selectedCategories.length > 0 ? selectedCategories : SEARCH_CATEGORIES.map(cat => cat.key);
      const page = isLoadMore ? currentPage : 1;
      const offset = (page - 1) * 35;

      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&categories=${encodeURIComponent(categories.join(','))}&limit=35&offset=${offset}&sort=-CreatedAt`);
      const data = await response.json();

      if (data.success) {
        if (isLoadMore) {
          setSearchResults(prev => [...prev, ...(data.videos || [])]);
          setCurrentPage(prev => prev + 1);
        } else {
          setSearchResults(data.videos || []);
          setCurrentPage(1);
          setHasNextPage((data.videos?.length || 0) === 35);
          setTotalResults(data.total || 0);
        }
      } else {
        console.error('Search failed:', data.error);
        if (!isLoadMore) {
          setSearchResults([]);
          setHasNextPage(false);
          setTotalResults(0);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      if (!isLoadMore) {
        setSearchResults([]);
        setHasNextPage(false);
        setTotalResults(0);
      }
    } finally {
      setIsSearching(false);
      isLoadingRef.current = false;
    }
  }, [searchTags, selectedCategories, currentPage]);

  // Trigger search when dependencies change
  useEffect(() => {
    if (searchTags.length > 0 || (searchTags.length === 0 && initialVideos.length === 0)) {
      performSearch(false);
    }
  }, [searchTags, selectedCategories, currentPage, performSearch, initialVideos.length]);

  // Initialize searchResults with initialVideos
  useEffect(() => {
    if (searchTags.length === 0 && searchResults.length === 0 && initialVideos.length > 0) {
      setSearchResults(initialVideos);
      setCurrentPage(1);
      setHasNextPage(initialVideos.length >= 35); // Assume more if we got a full page
      setTotalResults(0); // Will be updated when API is called
    }
  }, [searchTags.length, searchResults.length, initialVideos]);

  // Infinite scroll implementation
  const handleScroll = useCallback(() => {
    if (!loadingRef.current || isLoadingRef.current || !hasNextPage) {
      return;
    }

    const rect = loadingRef.current.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const isNearBottom = rect.top <= windowHeight + 800; // Trigger 800px before loading indicator reaches bottom

    if (isNearBottom && hasNextPage) {
      performSearch(true);
    }
  }, [hasNextPage, performSearch]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowCategorySelector(false);
      }
      if (e.key === 'Enter' && searchQuery.trim()) {
        e.preventDefault();
        addSearchTag(searchQuery, selectedCategories[0] || 'title');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery, selectedCategories, addSearchTag]);

  // Get available categories based on current search
  const availableCategories = useMemo(() => {
    if (!searchQuery.trim()) return SEARCH_CATEGORIES;

    return SEARCH_CATEGORIES.filter(cat =>
      cat.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.key.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Search Tags */}
            {searchTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {searchTags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="secondary"
                    className="flex items-center gap-1 px-2 py-1"
                  >
                    <Tag className="w-3 h-3" />
                    <span className="text-xs">{tag.label}</span>
                    <button
                      type="button"
                      onClick={() => removeSearchTag(tag.id)}
                      className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                      aria-label={`Remove ${tag.label} tag`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllTags}
                  className="h-6 px-2 text-xs"
                >
                  Clear all
                </Button>
              </div>
            )}

            {/* Main Search Input */}
            <div className="relative">
              <div className="relative flex items-center">
                <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search videos... (e.g., 'machine learning' → add tags with Enter)"
                  className="pl-10 pr-20"
                  onFocus={() => searchQuery.trim() && setShowCategorySelector(true)}
                />
                <div className="absolute right-2 flex items-center gap-1">
                  {selectedCategories.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedCategories([])}
                      className="h-6 w-6 p-0"
                      title="Clear category filter"
                    >
                      <Filter className="w-3 h-3" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCategorySelector(!showCategorySelector)}
                    className="h-6 w-6 p-0"
                    title="Select search categories"
                  >
                    <Tag className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Category Selector */}
              {showCategorySelector && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50">
                  <div className="p-2">
                    <div className="text-xs font-medium text-muted-foreground mb-2">
                      Search in categories:
                    </div>
                    <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto">
                      {availableCategories.map((category) => (
                        <button
                          key={category.key}
                          onClick={() => toggleCategory(category.key)}
                          className={`flex items-center gap-2 p-2 text-xs rounded hover:bg-accent ${
                            selectedCategories.includes(category.key)
                              ? 'bg-accent text-accent-foreground'
                              : 'text-muted-foreground'
                          }`}
                        >
                          <span>{category.icon}</span>
                          <span>{category.label}</span>
                        </button>
                      ))}
                    </div>
                    {searchQuery.trim() && (
                      <div className="mt-2 pt-2 border-t">
                        <Button
                          size="sm"
                          onClick={() => addSearchTag(searchQuery, selectedCategories[0] || 'title')}
                          className="w-full text-xs"
                          disabled={selectedCategories.length > 1}
                        >
                          Add &quot;{searchQuery}&quot; as tag
                          {selectedCategories.length === 1 && ` in ${SEARCH_CATEGORIES.find(c => c.key === selectedCategories[0])?.label}`}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Selected Categories Display */}
            {selectedCategories.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-muted-foreground">Searching in:</span>
                {selectedCategories.map((category) => {
                  const categoryInfo = SEARCH_CATEGORIES.find(cat => cat.key === category);
                  return (
                    <Badge key={category} variant="outline" className="text-xs">
                      {categoryInfo?.icon} {categoryInfo?.label}
                    </Badge>
                  );
                })}
              </div>
            )}

            {/* Search Logic Info */}
            {searchTags.length > 1 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>🔍 Multiple tags are combined with AND logic</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      <div className="space-y-3">
        {/* Results Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            <span className="text-sm text-muted-foreground">
              {isSearching
                ? 'Searching...'
                : searchTags.length > 0
                  ? `${searchResults.length}${totalResults > searchResults.length ? ` of ${totalResults}` : ''} video${searchResults.length !== 1 ? 's' : ''} found`
                  : `${searchResults.length}${totalResults > searchResults.length ? ` of ${totalResults}` : ''} video${searchResults.length !== 1 ? 's' : ''} total`
              }
            </span>
          </div>
          {searchTags.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearAllTags}>
              Show all videos
            </Button>
          )}
        </div>

        {/* Results Grid - Always show first */}
        {searchResults.length > 0 && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
            {searchResults.map((video, index) => (
              <VideoCard key={`${video.Id}-${index}`} video={video} priority={index === 0} />
            ))}
          </div>
        )}

        {/* Infinite scroll loading indicator - always render when hasNextPage to enable scroll detection */}
        {hasNextPage && (
          <div
            ref={loadingRef}
            className={`flex justify-center items-center py-8 ${isLoadingRef.current ? '' : 'opacity-0'}`}
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className={`h-4 w-4 ${isLoadingRef.current ? 'animate-spin' : ''}`} />
              <span>{isLoadingRef.current ? 'Loading more videos...' : 'Scroll for more videos'}</span>
            </div>
          </div>
        )}

        {/* Load More Button - Alternative to infinite scroll */}
        {hasNextPage && !isLoadingRef.current && (
          <div className="flex justify-center py-4">
            <Button
              variant="outline"
              onClick={() => performSearch(true)}
              disabled={isLoadingRef.current}
              className="flex items-center gap-2"
            >
              <Loader2 className={`h-4 w-4 ${isLoadingRef.current ? 'animate-spin' : ''}`} />
              {isLoadingRef.current ? 'Loading...' : 'Load More Videos'}
            </Button>
          </div>
        )}

        {/* End of content message - show only when not loading and no more pages */}
        {!hasNextPage && searchResults.length > 0 && !isLoadingRef.current && (
          <div className="flex justify-center py-8">
            <p className="text-muted-foreground">
              {searchTags.length > 0
                ? "You've reached the end of the search results"
                : "You've reached the end of the video collection"
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
