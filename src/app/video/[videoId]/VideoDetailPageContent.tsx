'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Edit3, ChevronDown, ChevronRight, ChevronLeft, ArrowLeft, AlertTriangle, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { Video, VideoListItem } from '@/lib/nocodb';
import { handleUpdateVideoDetailsAction } from '@/lib/actions';
import type { VideoUpdatePayload } from '@/lib/video-service';
import { StarRating } from '@/components/StarRating';

export type { Video, VideoListItem } from '@/lib/nocodb';

type SafeReactMarkdownProps = {
  children: string;
};
const SafeReactMarkdown = ({ children }: SafeReactMarkdownProps) => {
  return <ReactMarkdown>{children}</ReactMarkdown>;
};

type FieldValue = string | number | boolean | Date | string[] | Record<string, unknown> | Record<string, unknown>[] | PotentialLinkedItem | PotentialLinkedItem[] | null | undefined;

type PotentialLinkedItem = {
  Id: string | number;
  Title?: string;
  name?: string;
  url?: string; // For attachments like ThumbHigh
  // Allow other properties as NocoDB linked records can vary
  [key: string]: unknown; 
};

interface VideoDetailPageContentProps {
  video: Video;
  allVideos: VideoListItem[]; 
  previousVideo?: { Id: string; Title: string | null } | null;
  nextVideo?: { Id: string; Title: string | null } | null;
}

const formatFieldName = (fieldName: string): string => {
  return fieldName
    .replace(/([A-Z])/g, ' $1') 
    .replace(/_/g, ' ')        
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase()); 
};

const VIDEO_DETAIL_FIELDS_CONFIG = [
  // ThumbHigh and URL are handled separately before the main loop
  
  // Main content fields - reordered as per requirement
  { key: 'MainTopic', label: 'Main Topic', isMarkdown: true, isInitiallyCollapsed: false },
  { key: 'TLDR', label: 'TLDR', isMarkdown: true, isInitiallyCollapsed: false },
  { key: 'ActionableAdvice', label: 'Actionable Advice', isMarkdown: true, isInitiallyCollapsed: false },
  
  // Other markdown fields (with styling)
  { key: 'MainSummary', label: 'Main Summary', isMarkdown: true, isInitiallyCollapsed: false },
  { key: 'DetailedNarrativeFlow', label: 'Detailed Narrative Flow', isMarkdown: true, isInitiallyCollapsed: false },
  { key: 'MemorableQuotes', label: 'Memorable Quotes', isMarkdown: true, isInitiallyCollapsed: false },
  { key: 'MemorableTakeaways', label: 'Memorable Takeaways', isMarkdown: true, isInitiallyCollapsed: false },
  { key: 'KeyExamples', label: 'Key Examples', isMarkdown: true, isInitiallyCollapsed: false },
  
  // List fields
  { key: 'VideoGenre', label: 'Video Genre', isList: true, isInitiallyCollapsed: false },
  { key: 'Persons', label: 'Persons', isList: true, isInitiallyCollapsed: false },
  { key: 'Companies', label: 'Companies', isList: true, isInitiallyCollapsed: false },
  { key: 'Trends', label: 'Trends', isList: true, isInitiallyCollapsed: false },
  { key: 'Institutions', label: 'Institutions', isList: true, isInitiallyCollapsed: false },
  { key: 'KeyNumbersData', label: 'Key Numbers', isMarkdown: true, isInitiallyCollapsed: false },
  { key: 'BookMediaRecommendations', label: 'Book/Media Recommendations', isList: true, isInitiallyCollapsed: true },
  { key: 'ExternalURLs', label: 'External URLs', isList: true, isLinkList: true, isInitiallyCollapsed: true },
  { key: 'Indicators', label: 'Indicators', isList: true, isInitiallyCollapsed: true },
  { key: 'InvestableAssets', label: 'Investable Assets', isList: true, isInitiallyCollapsed: true },
  { key: 'TickerSymbol', label: '$Ticker', isInitiallyCollapsed: true },
  { key: 'EventsFairs', label: 'Events/Fairs', isList: true, isInitiallyCollapsed: true },
  { key: 'DOIs', label: 'DOIs', isList: true, isInitiallyCollapsed: true },
  { key: 'Tags', label: 'Hashtags', isList: true, isInitiallyCollapsed: true },
  { key: 'PrimarySources', label: 'Primary Sources', isList: true, isInitiallyCollapsed: true },
  { key: 'Sentiment', label: 'Sentiment Score', isInitiallyCollapsed: true },
  { key: 'SentimentReason', label: 'Sentiment Reason', isMarkdown: true, isInitiallyCollapsed: true },
  { key: 'Channel', label: 'Channel', isInitiallyCollapsed: true },
  { key: 'Description', label: 'Video Description (from YouTube)', isMarkdown: true, isInitiallyCollapsed: true },
  { key: 'TechnicalTerms', label: 'Technical Terms', isList: true, isInitiallyCollapsed: true },
  { key: 'Speaker', label: 'Speaker', isInitiallyCollapsed: true },
  { key: 'Transcript', label: 'Transcript', isMarkdown: true, isInitiallyCollapsed: false }
];

interface DetailItemProps {
  label: string;
  value: FieldValue;
  isLink?: boolean;
  isImage?: boolean;
  isList?: boolean;
  isMarkdown?: boolean;
  isInitiallyCollapsed?: boolean;
  isLinkList?: boolean; // Added for lists where each item is a link
}

const DetailItem = React.memo<DetailItemProps>(({ 
  label, 
  value, 
  isLink = false, 
  isImage = false, 
  isList = false, 
  isMarkdown = false, 
  isInitiallyCollapsed,
  isLinkList = false
}) => {
  // Create a unique key for this detail section
  const storageKey = `detail-${label.toLowerCase().replace(/\s+/g, '-')}-collapsed`;
  
  // Initialize state from session storage or prop
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return isInitiallyCollapsed ?? true;
    const stored = sessionStorage.getItem(storageKey);
    return stored !== null ? stored === 'true' : (isInitiallyCollapsed ?? true);
  });

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev: boolean) => {
      const newState = !prev;
      sessionStorage.setItem(storageKey, String(newState));
      return newState;
    });
  }, [storageKey]);

  const isEmpty = value === null || value === undefined || 
                (Array.isArray(value) && value.length === 0) || 
                (typeof value === 'string' && value.trim() === '');

  const renderValue = () => {
    if (isEmpty) {
      return <span className="text-sm text-neutral-500 italic">N/A</span>;
    }
    
    // Handle markdown content (string only)
    if (isMarkdown && typeof value === 'string') {
      return (
        <div className="prose prose-invert prose-neutral prose-sm max-w-none markdown-box">
          <SafeReactMarkdown>{value}</SafeReactMarkdown>
        </div>
      );
    }
    
    // Handle list content (array of strings or objects)
    if (isList && Array.isArray(value)) {
      return (
        <div className="space-y-1">
          {value.map((item, index) => {
            const itemValue = item && typeof item === 'object' && 'Title' in item 
              ? (item as { Title: string }).Title 
              : String(item);
            return (
              <div key={index} className="flex items-start">
                <span className="mr-2">•</span>
                <span>{itemValue}</span>
              </div>
            );
          })}
        </div>
      );
    }

    if (isImage && typeof value === 'string' && value) {
      
      return <Image src={value as string} alt={label} width={320} height={192} className="max-w-xs max-h-48 object-contain rounded-md my-2" />;
    }

    if (isLink && typeof value === 'string' && value) {
      return <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline truncate block max-w-full">{value}</a>;
    }

    if (isLinkList && Array.isArray(value)) {
      return (
        <ul className="list-disc list-inside space-y-1">
          {value.map((item, index) => {
            if (typeof item === 'string' && item.startsWith('http')) {
              return <li key={index}><a href={item} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">{item}</a></li>;
            } else if (typeof item === 'object' && item !== null) {
              const linkedItem = item as PotentialLinkedItem;
              // Handle NocoDB attachment objects (like ThumbHigh, which could be in a list)
              if (linkedItem.url && typeof linkedItem.url === 'string' && linkedItem.url.startsWith('http')) {
                return <li key={`linked-${linkedItem.Id || index}-url`}><a href={linkedItem.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">{linkedItem.Title || linkedItem.name || linkedItem.url}</a></li>;
              }
              // Handle regular linked records that might have a URL in Title or name
              const linkCandidate = linkedItem.Title || linkedItem.name;
              if (typeof linkCandidate === 'string' && linkCandidate.startsWith('http')) {
                 return <li key={`linked-${linkedItem.Id || index}-cand`}><a href={linkCandidate} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">{linkCandidate}</a></li>;
              }
              // If linked item is not a direct URL, display its Title/name or ID
              return <li key={`linked-${linkedItem.Id || index}-obj`} className="text-neutral-300">{linkedItem.Title || linkedItem.name || `Linked Item: ${linkedItem.Id}`}</li>;
            }
            // Fallback for non-URL strings or other primitive types in the array
            return <li key={`primitive-${index}`} className="text-neutral-300">{String(item)}</li>;
          })}
        </ul>
      );
    }

    if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
      
      const date = new Date(value);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    }

    if (isList && Array.isArray(value)) {
      return (
        <ul className="list-disc pl-5 space-y-1">
          {value.map((item, index) => {
            const itemValue = item && typeof item === 'object' && 'Title' in item 
              ? (item as { Title: string }).Title 
              : String(item);
              
            return (
              <li key={index} className={isLink ? 'text-blue-600 hover:underline' : ''}>
                {isLink ? (
                  <a href={itemValue} target="_blank" rel="noopener noreferrer">
                    {itemValue}
                  </a>
                ) : (
                  itemValue
                )}
              </li>
            );
          })}
        </ul>
      );
    }

    if (typeof value === 'object' && value !== null) {
      
      if (label === 'Transcript' && value) {
        
        const transcriptText = typeof value === 'string' ? value : 
                             (value && typeof value === 'object' && 'toString' in value) ? 
                             value.toString() : 
                             '';
        
        if (!transcriptText) return null;
            
        return (
          <div key="transcript" className="space-y-3 mt-2 max-h-96 overflow-y-auto p-4 border rounded bg-gray-50 dark:bg-gray-800">
            <h3 className="text-lg font-semibold mb-2">Transcript</h3>
            <div className="space-y-3">
              {transcriptText.split('\n\n').filter(Boolean).map((block: string, index: number) => {
                const [firstLine, ...rest] = block.split('\n');
                const timeMatch = firstLine?.match(/\d{2}:\d{2}:\d{2},\d{3}/);
                const text = rest.join(' ').trim();
                
                if (!text) return null;
                
                return (
                  <div key={index} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                    {timeMatch && (
                      <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                        {timeMatch[0]}
                      </span>
                    )}
                    {text && (
                      <p className="mt-1 text-gray-800 dark:text-gray-200">
                        {text}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      }
      return <pre className="text-sm whitespace-pre-wrap break-all">{JSON.stringify(value, null, 2)}</pre>;
    }

    return <span className="text-sm break-words">{String(value)}</span>;
  };

  
  if (isEmpty) {
    return null;
  }

  return (
    <div className="mb-3 last:mb-0 bg-neutral-800/50 p-3 rounded-lg shadow-sm">
      <button 
        onClick={toggleCollapse}
        className="w-full flex justify-between items-center cursor-pointer list-none p-0 bg-transparent border-none"
        aria-expanded={!isCollapsed}
      >
        <span className="text-xs font-medium text-neutral-400 hover:text-neutral-300 transition-colors">
          {formatFieldName(label)}
        </span>
        <div className="text-neutral-500 hover:text-neutral-300 transition-colors">
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </button>
      {!isCollapsed && (
        <div className="mt-2 pl-1 text-neutral-100">
          {renderValue()}
        </div>
      )}
    </div>
  );
});

DetailItem.displayName = 'DetailItem';

const VideoDetailPageContent: React.FC<VideoDetailPageContentProps> = ({
  video: initialVideo, 
  previousVideo,
  nextVideo,
}: VideoDetailPageContentProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentVideo, setCurrentVideo] = useState<Video>(initialVideo);
  const [originalVideo, setOriginalVideo] = useState<Video>(initialVideo); // For reverting optimistic updates
  const [personalComment, setPersonalComment] = useState<string>(initialVideo.PersonalComment || '');
  const [isEditingComment, setIsEditingComment] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [activeImportanceRating, setActiveImportanceRating] = useState<number | null>(() => {
    const ratingValue = initialVideo.ImportanceRating;
    
    // Handle null/undefined cases
    if (ratingValue === null || ratingValue === undefined) {
      return null;
    }
    
    // If it's already a number between 1-5, use it
    if (typeof ratingValue === 'number' && ratingValue >= 1 && ratingValue <= 5) {
      return ratingValue;
    }
    
    // If it's a string, try to parse it
    if (typeof ratingValue === 'string') {
      // Type guard to ensure we can call trim()
      const strValue = String(ratingValue);
      const trimmed = strValue.trim();
      if (trimmed === '') {
        return null;
      }
      
      const parsed = parseInt(trimmed, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 5) {
        return parsed;
      }
    }
    
    // If we get here, the value is invalid
    console.warn(`[useState activeImportanceRating init] Invalid rating value ${JSON.stringify(ratingValue)}, treating as null.`);
    return null;
  });
  
  const [isReworkSummaryCollapsed, setIsReworkSummaryCollapsed] = useState<boolean>(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setCurrentVideo(initialVideo);
    setOriginalVideo(initialVideo);
    setPersonalComment(initialVideo.PersonalComment || '');
    
    // Logic for activeImportanceRating
    const ratingValue: unknown = initialVideo.ImportanceRating;
    let numericRating: number | null = null;
    if (typeof ratingValue === 'number') {
      numericRating = ratingValue;
    } else if (typeof ratingValue === 'string' && ratingValue.trim() !== '') {
      const parsed = parseInt(ratingValue, 10);
      if (!isNaN(parsed)) {
        numericRating = parsed;
      }
    }
    if (numericRating !== null && (numericRating < 1 || numericRating > 5)) {
      console.warn(`[useEffect initialVideo change] Invalid rating value ${numericRating} from prop, treating as null.`);
      numericRating = null;
    }
    setActiveImportanceRating(numericRating);

    setIsEditingComment(false);
    setSaveError(null);
    setIsSaving(false); // Reset saving state on video change
  }, [initialVideo]);

  



  const handleImportanceRatingChange = useCallback(async (newRating: number | null) => {
    if (!currentVideo?.VideoID) {
      alert('Error: VideoID is missing. Cannot update rating.');
      return;
    }
    // Optimistically update UI
    setActiveImportanceRating(newRating);
    setIsSaving(true);
    setSaveError(null);

    try {
      const videoIdStr = String(currentVideo.VideoID);
      const payload: Partial<VideoUpdatePayload> = { ImportanceRating: newRating };
      const updated = await handleUpdateVideoDetailsAction(videoIdStr, payload);
      console.log('[handleImportanceRatingChange] Received from action. Updated Rating:', updated?.ImportanceRating);
      if (updated) {
        setCurrentVideo(updated);
        setOriginalVideo(updated);
        // Ensure activeImportanceRating reflects the saved value (might be null)
        const updatedRatingValue: unknown = updated.ImportanceRating;
        let numericRatingUpdated: number | null = null;
        if (typeof updatedRatingValue === 'number') {
          numericRatingUpdated = updatedRatingValue;
        } else if (typeof updatedRatingValue === 'string' && updatedRatingValue.trim() !== '') { // Fallback, less likely now
          const parsed = parseInt(updatedRatingValue, 10);
          if (!isNaN(parsed)) {
            numericRatingUpdated = parsed;
          }
        }
        // Final safety check: ensure value is within 1-5 range if not null
        if (numericRatingUpdated !== null && (numericRatingUpdated < 1 || numericRatingUpdated > 5)) {
          console.warn(`[handleImportanceRatingChange] Invalid rating value ${numericRatingUpdated} from server, treating as null.`);
          numericRatingUpdated = null;
        }
        setActiveImportanceRating(numericRatingUpdated);

      } else {
        console.error('Failed to update Importance Rating: Server action returned null or update was not applied as expected.');
        alert('Failed to update rating. The video data could not be refreshed. Please try again.');
        // Revert optimistic update if newRating was set prior to this, or refresh data.
        // For now, we are showing an error. The original activeImportanceRating is still from before the try block.
      }
    } catch (error) {
      console.error('Failed to update Importance Rating:', error);
      alert(`Error updating rating: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Revert optimistic update
      const originalRatingValue: unknown = originalVideo.ImportanceRating;
      let numericRatingOriginal: number | null = null;
      if (typeof originalRatingValue === 'string' && originalRatingValue.trim() !== '') {
        const parsed = parseInt(originalRatingValue, 10);
        if (!isNaN(parsed)) {
          numericRatingOriginal = parsed;
        }
      }
      setActiveImportanceRating(numericRatingOriginal);
      setCurrentVideo(originalVideo);
    } finally {
      setIsSaving(false);
    }
  }, [currentVideo, originalVideo, setCurrentVideo, setOriginalVideo, setActiveImportanceRating, setIsSaving, setSaveError]);

  const handleReworkSummary = useCallback(async () => {
    if (!currentVideo || !currentVideo.VideoID) {
      alert('Error: VideoID is missing. Cannot perform rework action.');
      return;
    }
    if (!confirm("Are you sure you want to mark this video as reworked? This will clear the 'Detailed Narrative Flow'. This action cannot be undone easily.")) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      const videoIdStr = String(currentVideo.VideoID);
      const payload: Partial<VideoUpdatePayload> = { DetailedNarrativeFlow: null };
      const updated = await handleUpdateVideoDetailsAction(videoIdStr, payload);
      if (updated) {
        setCurrentVideo(updated);
        setOriginalVideo(updated);
        alert('Video marked as reworked. Detailed Narrative Flow has been cleared.');
      } else {
        console.error('Failed to mark as reworked: Server action returned null or update was not applied as expected.');
        alert('Failed to mark as reworked. The video data could not be refreshed. Please try again.');
      }
    } catch (error) {
      console.error('Failed to mark as reworked:', error);
      alert(`Error marking as reworked: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Optionally revert: setCurrentVideo(originalVideo);
    } finally {
      setIsSaving(false);
    }
// eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVideo, originalVideo, setCurrentVideo, setOriginalVideo, setIsSaving, setSaveError]);

  const handleDeleteVideo = useCallback(async () => {
    if (!currentVideo || !currentVideo.VideoID) {
      alert('Video information is not available.');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete the video "${currentVideo.Title || currentVideo.VideoID}"? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/nocodb/video/${currentVideo.VideoID}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response from server.' }));
        throw new Error(errorData.error || `Failed to delete video. Status: ${response.status}`);
      }

      const result = await response.json();
      alert(result.message || 'Video deleted successfully!');
      router.push('/'); // Redirect to homepage or video list page
    } catch (error) {
      console.error('Failed to delete video:', error);
      alert(`Error deleting video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  }, [currentVideo, router]);

  const navigateToVideo = useCallback((direction: 'prev' | 'next') => {
    const currentQuery = searchParams.toString();
    const queryString = currentQuery ? `?${currentQuery}` : '';

    let targetVideoId: string | undefined;
    if (direction === 'prev' && previousVideo?.Id) {
      targetVideoId = previousVideo.Id;
    } else if (direction === 'next' && nextVideo?.Id) {
      targetVideoId = nextVideo.Id;
    }

    if (targetVideoId) {
      router.push(`/video/${targetVideoId}${queryString}`);
    }
  }, [previousVideo, nextVideo, router, searchParams]);

  const handleSaveComment = useCallback(async () => {
    if (!currentVideo?.VideoID) {
      alert('Error: VideoID is missing. Cannot save comment.');
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      const videoIdStr = String(currentVideo.VideoID);
      const payload: Partial<VideoUpdatePayload> = { PersonalComment: personalComment };
      const updated = await handleUpdateVideoDetailsAction(videoIdStr, payload);
      console.log('[handleSaveComment] Received from action. Updated Comment:', updated?.PersonalComment);
      if (updated) {
        setCurrentVideo(updated);
        setOriginalVideo(updated); 
        setIsEditingComment(false);

      } else {
        console.error('Failed to save personal comment: Server action returned null or update was not applied as expected.');
        alert('Failed to save comment. The video data could not be refreshed. Please try again.');
      }
    } catch (error) {
      console.error('Failed to save personal comment:', error);
      alert(`Error saving comment: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Optionally revert: setCurrentVideo(originalVideo); setPersonalComment(originalVideo.PersonalComment || '');
    } finally {
      setIsSaving(false);
    }
  }, [currentVideo, personalComment, setCurrentVideo, setOriginalVideo, setIsSaving, setSaveError, setIsEditingComment]);

  // ... (rest of the code remains the same)

  if (!currentVideo) {
    return (
      <div className="container mx-auto p-4 min-h-screen flex items-center justify-center">
        <p className="text-xl text-neutral-400">Loading video details...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-50 p-4 md:p-8 font-plex-sans">
      <div className="container mx-auto max-w-5xl">
        {}
        <div className="mb-6 flex flex-wrap justify-between items-center gap-4">
          <Link href={`/?sort=${searchParams.get('sort') || '-CreatedAt'}`} className="flex items-center text-blue-400 hover:text-blue-300 transition-colors group">
            <ArrowLeft size={18} className="mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
            Back to Video List
          </Link>
          <div className="flex space-x-2">
            <button
              onClick={() => navigateToVideo('prev' as 'prev' | 'next')}
              disabled={!previousVideo}
              className="flex items-center px-4 py-2 bg-brand-secondary hover:bg-brand-secondary/80 text-white font-medium rounded-md shadow-sm transition-all duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:ring-opacity-60"
              title={previousVideo?.Title || 'No previous video'}
            >
              <ChevronLeft size={20} className="mr-1" /> Previous
            </button>
            <button
              onClick={() => navigateToVideo('next' as 'prev' | 'next')}
              disabled={!nextVideo}
              className="flex items-center px-4 py-2 bg-brand-secondary hover:bg-brand-secondary/80 text-white font-medium rounded-md shadow-sm transition-all duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:ring-opacity-60"
              title={nextVideo?.Title || 'No next video'}
            >
              Next <ChevronRight size={20} className="ml-1" />
            </button>
          </div>
        </div>

        {}
        <h1 className="text-3xl font-semibold mb-4 text-neutral-100 break-words hyphens-auto" title={currentVideo.Title || 'Video Title'}>
          {currentVideo.Title || 'Untitled Video'}
        </h1>
        
        {}
        {saveError && (
          <div className="mb-4 p-3 bg-red-700/30 border border-red-600 text-red-300 rounded-md flex items-center">
            <AlertTriangle size={20} className="mr-2" />
            <span>Error: {saveError}</span>
          </div>
        )}

        {} 
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {}
          <div className="md:col-span-2 space-y-4">
            {currentVideo.ThumbHigh && (
              <Image 
                src={currentVideo.ThumbHigh as string} 
                alt={`${currentVideo.Title || 'Video'} thumbnail`} 
                width={640} 
                height={360} 
                className="rounded-lg shadow-lg w-full max-w-2xl aspect-video object-cover mb-4" 
                priority 
              />
            )}
            {currentVideo.URL && (
              <div className="mb-6">
                <a href={currentVideo.URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-lg text-blue-400 hover:text-blue-300 hover:underline">
                  Watch on YouTube <ChevronRight size={20} className="ml-1" />
                </a>
              </div>
            )}
            <div className="grid grid-cols-1 gap-4"> 
              {/* Dynamically ordered video details */}
              {VIDEO_DETAIL_FIELDS_CONFIG.map(fieldConfig => {
                const fieldValue = currentVideo[fieldConfig.key as keyof Video];
                
                // Always show TLDR section even if empty
                if (fieldConfig.key === 'TLDR') {
                  return (
                    <DetailItem
                      key={fieldConfig.key}
                      label={fieldConfig.label}
                      value={fieldValue as FieldValue || 'No summary available'}
                      isMarkdown={!!fieldConfig.isMarkdown}
                      isList={!!fieldConfig.isList}
                      isLinkList={!!fieldConfig.isLinkList}
                      isInitiallyCollapsed={fieldConfig.isInitiallyCollapsed === undefined ? true : fieldConfig.isInitiallyCollapsed}
                    />
                  );
                }
                
                // Skip rendering other fields if empty
                if (fieldValue === null || fieldValue === undefined) return null;
                if (typeof fieldValue === 'string' && fieldValue.trim() === '') return null;
                if (Array.isArray(fieldValue) && fieldValue.length === 0) return null;
                // Additional check for empty objects
                if (fieldValue !== null && typeof fieldValue === 'object' && !Array.isArray(fieldValue) && Object.keys(fieldValue).length === 0) return null;

                return (
                  <DetailItem
                    key={fieldConfig.key}
                    label={fieldConfig.label}
                    value={fieldValue as FieldValue}
                    isMarkdown={!!fieldConfig.isMarkdown}
                    isList={!!fieldConfig.isList}
                    isLinkList={!!fieldConfig.isLinkList}
                    isInitiallyCollapsed={fieldConfig.isInitiallyCollapsed === undefined ? true : fieldConfig.isInitiallyCollapsed}
                  />
                );
              })}
              
              {/* Raw Data section (optional, can be kept or removed) */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-6 pt-6 border-t border-neutral-700/50">
                  <h3 className="text-xl font-semibold mb-3 text-neutral-100">Raw Data (Dev Only)</h3>
                  <pre className="bg-neutral-800 p-3 rounded-md text-xs text-neutral-300 overflow-x-auto whitespace-pre-wrap break-all">
                    {JSON.stringify(currentVideo, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {}
          <div className="md:col-span-1 space-y-6">
            {}
            <div className="p-4 bg-neutral-800 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2 text-neutral-300">Importance Rating</h3>
              <StarRating
                value={typeof activeImportanceRating === 'number' ? activeImportanceRating : null}
                onChange={handleImportanceRatingChange}
                size={28}
                readOnly={isSaving}
              />
            </div>

            {}
            <div className="p-4 bg-neutral-800 rounded-lg shadow">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold text-neutral-300">Personal Note</h3>
                {!isEditingComment && (
                  <button
                    onClick={() => setIsEditingComment(true)}
                    className="text-sm flex items-center px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                  >
                    <Edit3 size={18} className="mr-1.5" />
                    {currentVideo.PersonalComment ? 'Edit' : 'Add Note'}
                  </button>
                )}
              </div>
              {isEditingComment ? (
                <div className="space-y-3">
                  <textarea
                    value={personalComment}
                    onChange={(e) => setPersonalComment(e.target.value)}
                    className="w-full p-2.5 bg-neutral-700 text-neutral-50 rounded-md border border-neutral-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    rows={6}
                    disabled={isSaving}
                    placeholder="Your private notes about this video..."
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => {
                        setIsEditingComment(false);
                        setPersonalComment(currentVideo.PersonalComment || '');
                      }}
                      className="px-4 py-2 text-sm rounded-md bg-neutral-600 hover:bg-neutral-500 text-neutral-200 transition-colors"
                      disabled={isSaving}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveComment}
                      className="px-4 py-2 text-sm rounded-md bg-green-600 hover:bg-green-500 text-white transition-colors"
                      disabled={isSaving}
                    >
                      {isSaving ? 'Saving...' : 'Save Note'}
                    </button>
                  </div>
                </div>
              ) : (
                currentVideo.PersonalComment ? (
                  <div className="prose prose-sm prose-invert max-w-none text-neutral-300 overflow-hidden">
                    <SafeReactMarkdown>
                      {currentVideo.PersonalComment}
                    </SafeReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm text-neutral-400 italic">No personal note added yet.</p>
                )
              )}
            </div>

            {/* Video Actions Card */}
            <div className="bg-neutral-800/50 rounded-lg shadow-sm mb-3">
              <button 
                onClick={() => setIsReworkSummaryCollapsed(!isReworkSummaryCollapsed)}
                className="w-full flex justify-between items-center cursor-pointer p-4"
                aria-expanded={!isReworkSummaryCollapsed}
              >
                <h3 className="text-lg font-semibold text-neutral-300">Video Actions</h3>
                <div className="text-neutral-500 hover:text-neutral-300 transition-colors">
                  {isReworkSummaryCollapsed ? (
                    <ChevronRight className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </div>
              </button>
              {!isReworkSummaryCollapsed && (
                <div className="px-4 pb-4 pt-0 space-y-4">
                  {/* Rework Summary Action */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-neutral-300">Rework Summary</h4>
                    <button
                      onClick={handleReworkSummary}
                      className="w-full px-4 py-2 text-sm font-medium rounded-md bg-yellow-600 hover:bg-yellow-500 text-white transition-colors flex items-center justify-center"
                      disabled={isSaving || isDeleting}
                    >
                      {isSaving ? (
                        <>
                          <ChevronDown className="animate-spin h-4 w-4 mr-2" /> Processing...
                        </>
                      ) : (
                        <>
                          <AlertTriangle size={16} className="mr-2" /> Mark as Reworked (Clear Narrative)
                        </>
                      )}
                    </button>
                    <p className="text-xs text-neutral-400">
                      This will clear the &apos;Detailed Narrative Flow&apos; field. This action is useful if you plan to regenerate or significantly revise this section.
                    </p>
                  </div>

                  {/* Delete Video Action */}
                  <div className="space-y-2 pt-2 border-t border-neutral-700">
                    <h4 className="text-sm font-medium text-neutral-300">Danger Zone</h4>
                    <button
                      onClick={handleDeleteVideo}
                      className="w-full px-4 py-2 text-sm font-medium rounded-md bg-red-700 hover:bg-red-600 text-white transition-colors flex items-center justify-center"
                      disabled={isDeleting || isSaving}
                    >
                      {isDeleting ? (
                        <>
                          <ChevronDown className="animate-spin h-4 w-4 mr-2" /> Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 size={16} className="mr-2" /> Delete Video
                        </>
                      )}
                    </button>
                    <p className="text-xs text-neutral-400">
                      This will permanently remove the video and its associated data from the system.
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Metadata Box */}
            <div className="p-4 bg-neutral-800 rounded-lg shadow text-xs text-neutral-400 space-y-1">
                {currentVideo.VideoID && <p>Video ID: <span className="font-mono">{currentVideo.VideoID}</span></p>}
                {currentVideo.CreatedAt && <p>Created: {new Date(currentVideo.CreatedAt).toLocaleString()}</p>}
                {currentVideo.UpdatedAt && <p>Last Updated: {new Date(currentVideo.UpdatedAt).toLocaleString()}</p>}
                {currentVideo.PublishedAt && <p>Published: {new Date(currentVideo.PublishedAt).toLocaleString()}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoDetailPageContent;

