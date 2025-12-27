/**
 * Offline Search Functions
 *
 * Client-side search for cached videos
 */

import { getAllVideos } from './db/client';
import type { VideoOffline } from './schemas';

interface SearchOptions {
  query: string;
  categories?: string[];
  limit?: number;
  offset?: number;
}

/**
 * Perform offline search on cached videos
 */
export async function searchOfflineVideos(
  options: SearchOptions
): Promise<{ videos: VideoOffline[]; total: number }> {
  const { query, categories = [], limit = 35, offset = 0 } = options;

  // Get all cached videos
  const videos = await getAllVideos();

  // If no query, just return paginated results (sorted by PublishedAt DESC)
  if (!query.trim()) {
    // Sort by PublishedAt DESC (neueste zuerst)
    videos.sort((a, b) => {
      if (!a.PublishedAt || !b.PublishedAt) return 0;
      return new Date(b.PublishedAt).getTime() - new Date(a.PublishedAt).getTime();
    });

    const total = videos.length;
    const paginated = videos.slice(offset, offset + limit);
    return { videos: paginated, total };
  }

  // Split query into search terms
  const searchTerms = query.toLowerCase().trim().split(/\s+/);

  // Filter videos based on search terms
  const filteredVideos = videos.filter(video => {
    // Check if ALL search terms match in at least one field
    return searchTerms.every(term => {
      return matchesInCategories(video, term, categories);
    });
  });

  // Sort by relevance (title matches first, then description, etc.)
  filteredVideos.sort((a, b) => {
    const scoreA = calculateRelevanceScore(a, searchTerms);
    const scoreB = calculateRelevanceScore(b, searchTerms);
    return scoreB - scoreA;
  });

  const total = filteredVideos.length;
  const paginated = filteredVideos.slice(offset, offset + limit);

  return { videos: paginated, total };
}

/**
 * Check if search term matches in specified categories
 */
function matchesInCategories(
  video: VideoOffline,
  term: string,
  categories: string[]
): boolean {
  // If no categories specified, search all
  if (categories.length === 0) {
    return matchesInAllFields(video, term);
  }

  // Search only in specified categories
  for (const category of categories) {
    if (matchesInCategory(video, term, category)) {
      return true;
    }
  }

  return false;
}

/**
 * Match term in specific category
 */
function matchesInCategory(
  video: VideoOffline,
  term: string,
  category: string
): boolean {
  switch (category) {
    case 'title':
      return video.Title?.toLowerCase().includes(term) ?? false;

    case 'description':
      return video.Description?.toLowerCase().includes(term) ?? false;

    case 'channel':
      return video.Channel?.toLowerCase().includes(term) ?? false;

    case 'speaker':
      return video.Speaker?.toLowerCase().includes(term) ?? false;

    case 'hashtag':
      return video.Hashtags?.some(h => h.toLowerCase().includes(term)) ?? false;

    case 'person':
      return (
        video.Persons?.some(
          p => p.Title?.toLowerCase().includes(term) || p.name?.toLowerCase().includes(term)
        ) ?? false
      );

    case 'company':
      return (
        video.Companies?.some(
          c => c.Title?.toLowerCase().includes(term) || c.name?.toLowerCase().includes(term)
        ) ?? false
      );

    case 'genre':
      return video.VideoGenre?.toLowerCase().includes(term) ?? false;

    case 'topic':
      return video.MainTopic?.toLowerCase().includes(term) ?? false;

    default:
      return false;
  }
}

/**
 * Match term in all searchable fields
 */
function matchesInAllFields(video: VideoOffline, term: string): boolean {
  const fields = [
    video.Title,
    video.Description,
    video.Channel,
    video.Speaker,
    video.VideoGenre,
    video.MainTopic,
    ...(video.Hashtags || []),
    ...(video.Persons?.map(p => p.Title || p.name) || []),
    ...(video.Companies?.map(c => c.Title || c.name) || []),
  ];

  return fields.some(field => field?.toLowerCase().includes(term));
}

/**
 * Calculate relevance score for sorting
 */
function calculateRelevanceScore(video: VideoOffline, terms: string[]): number {
  let score = 0;

  for (const term of terms) {
    // Title matches: highest weight
    if (video.Title?.toLowerCase().includes(term)) {
      score += 10;
    }

    // Channel matches
    if (video.Channel?.toLowerCase().includes(term)) {
      score += 5;
    }

    // Hashtag exact matches
    if (video.Hashtags?.some(h => h.toLowerCase() === term)) {
      score += 8;
    }

    // Hashtag partial matches
    if (video.Hashtags?.some(h => h.toLowerCase().includes(term))) {
      score += 3;
    }

    // Description matches
    if (video.Description?.toLowerCase().includes(term)) {
      score += 2;
    }
  }

  return score;
}
