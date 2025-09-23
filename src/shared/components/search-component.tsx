"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Card, CardContent } from "@/shared/components/ui/card";
import { X, Search, Loader2, Filter, Tag } from "lucide-react";
import type { VideoListItem } from "@/features/videos/api/nocodb";
import { VideoCard } from "@/features/videos/components/video-card";

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

export function SearchComponent({ initialVideos = [], className }: SearchComponentProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTags, setSearchTags] = useState<SearchTag[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<VideoListItem[]>(initialVideos);
  const [isSearching, setIsSearching] = useState(false);
  const [showCategorySelector, setShowCategorySelector] = useState(false);

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
    setSearchResults(initialVideos);
  }, [initialVideos]);

  // Perform search
  const performSearch = useCallback(async () => {
    if (searchTags.length === 0) {
      setSearchResults(initialVideos);
      return;
    }

    setIsSearching(true);

    try {
      const query = searchTags.map(tag => tag.value).join(' ');
      const categories = selectedCategories.length > 0 ? selectedCategories : SEARCH_CATEGORIES.map(cat => cat.key);

      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&categories=${encodeURIComponent(categories.join(','))}&limit=100`);
      const data = await response.json();

      if (data.success) {
        setSearchResults(data.videos || []);
      } else {
        console.error('Search failed:', data.error);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchTags, selectedCategories, initialVideos]);

  // Trigger search when tags change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch();
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [performSearch]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowCategorySelector(false);
      }
      if (e.key === 'Enter' && searchQuery.trim()) {
        if (selectedCategories.length === 1) {
          addSearchTag(searchQuery, selectedCategories[0]);
        } else {
          setShowCategorySelector(true);
        }
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
    <div className={`space-y-4 ${className || ''}`}>
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
                  placeholder="Search videos... (e.g., 'machine learning', 'John Doe', '#ai')"
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
                : `${searchResults.length} video${searchResults.length !== 1 ? 's' : ''} found`
              }
            </span>
          </div>
          {searchTags.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearAllTags}>
              Show all videos
            </Button>
          )}
        </div>

        {/* Results Grid */}
        {searchResults.length > 0 && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
            {searchResults.map((video, index) => (
              <VideoCard key={video.Id} video={video} priority={index === 0} />
            ))}
          </div>
        )}

        {/* No Results */}
        {!isSearching && searchTags.length > 0 && searchResults.length === 0 && (
          <div className="text-center py-8">
            <div className="text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No videos found matching your search criteria.</p>
              <p className="text-sm">Try adjusting your search terms or categories.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
