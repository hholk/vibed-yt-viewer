'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Edit3, ChevronDown, ChevronRight, ChevronLeft, ArrowLeft, AlertTriangle } from 'lucide-react';
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

type FieldValue = string | number | boolean | Date | string[] | Record<string, unknown> | Record<string, unknown>[] | null | undefined;

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

const MARKDOWN_FIELDS = [
  'ActionableAdvice',
  'TLDR',
  'MainSummary',
  'KeyNumbersData',
  'KeyExamples',
  'DetailedNarrativeFlow',
  'MemorableQuotes',
  'MemorableTakeaways',
  'Description',
];

interface DetailItemProps {
  label: string;
  value: FieldValue;
  isLink?: boolean;
  isImage?: boolean;
  isList?: boolean;
  isMarkdown?: boolean;
  isInitiallyCollapsed?: boolean;
}

const DetailItem = React.memo<DetailItemProps>(({ 
  label, 
  value, 
  isLink = false, 
  isImage = false, 
  isList = false, 
  isMarkdown = false, 
  isInitiallyCollapsed
}) => {
  
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return isInitiallyCollapsed ?? true; 
    
    if (isInitiallyCollapsed !== undefined) {
      return isInitiallyCollapsed;
    }
    const savedState = localStorage.getItem(`collapsed_${label}`);
    return savedState ? JSON.parse(savedState) : true; 
  });

  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`collapsed_${label}`, JSON.stringify(isCollapsed));
    }
  }, [isCollapsed, label]);

  const toggleCollapse = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsCollapsed(prev => !prev);
  }, []);

  const isEmpty = value === null || value === undefined || 
                (Array.isArray(value) && value.length === 0) || 
                (typeof value === 'string' && value.trim() === '');

  const renderValue = () => {
    if (isEmpty) {
      return <span className="text-sm text-neutral-500 italic">N/A</span>;
    }
    
    if (isMarkdown && typeof value === 'string') { 
      return (
        <div className="prose prose-invert prose-neutral prose-sm max-w-none markdown-box">
          <SafeReactMarkdown>
            {value}
          </SafeReactMarkdown>
        </div>
      );
    }

    if (isImage && typeof value === 'string' && value) {
      
      return <Image src={value as string} alt={label} width={320} height={192} className="max-w-xs max-h-48 object-contain rounded-md my-2" />;
    }

    if (isLink && typeof value === 'string' && value) {
      return <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline truncate block max-w-full">{value}</a>;
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

export function VideoDetailPageContent({
  video,
  
  previousVideo,
  nextVideo,
}: VideoDetailPageContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentVideo, setCurrentVideo] = useState<Video>(video);
  const [originalVideo, setOriginalVideo] = useState<Video>(video); // For reverting optimistic updates
  // For editing personal comment
  const [personalComment, setPersonalComment] = useState<string>(currentVideo.PersonalComment || '');
  const [isEditingComment, setIsEditingComment] = useState<boolean>(false);
  // For loading/saving states
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null); // For displaying errors

  useEffect(() => {
    console.log('[VideoDetailPageContent] currentVideo state changed. Rating:', currentVideo?.ImportanceRating, 'Comment:', currentVideo?.PersonalComment);
  }, [currentVideo]);
  
  const [activeImportanceRating, setActiveImportanceRating] = useState<number | null>(() => {
    const ratingValue: unknown = currentVideo.ImportanceRating; // currentVideo is 'video' prop on initial render
    let numericRating: number | null = null;
    if (typeof ratingValue === 'number') {
      numericRating = ratingValue;
    } else if (typeof ratingValue === 'string' && ratingValue.trim() !== '') {
      const parsed = parseInt(ratingValue, 10);
      if (!isNaN(parsed)) {
        numericRating = parsed;
      }
    }
    // Safety check for initial load
    if (numericRating !== null && (numericRating < 1 || numericRating > 5)) {
      console.warn(`[useState activeImportanceRating init] Invalid rating value ${numericRating}, treating as null.`);
      numericRating = null;
    }
    return numericRating;
  });
  
  useEffect(() => {
    setCurrentVideo(video);
    setOriginalVideo(video); // Initialize originalVideo
    setPersonalComment(video.PersonalComment || '');
    const ratingValue: unknown = video.ImportanceRating;
    let numericRating: number | null = null;
    if (typeof ratingValue === 'number') {
      numericRating = ratingValue;
    } else if (typeof ratingValue === 'string' && ratingValue.trim() !== '') {
      const parsed = parseInt(ratingValue, 10);
      if (!isNaN(parsed)) {
        numericRating = parsed;
      }
    }
    // Safety check
    if (numericRating !== null && (numericRating < 1 || numericRating > 5)) {
      console.warn(`[useEffect on video change] Invalid rating value ${numericRating} from prop, treating as null.`);
      numericRating = null;
    }
    setActiveImportanceRating(numericRating);
    // Reset editing states when video prop changes
    setIsEditingComment(false);
    setIsSaving(false);
    setSaveError(null);
  }, [video]);

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

  const detailFieldOrder: (keyof Video)[] = [
    'ThumbHigh',
    'URL',
    'ActionableAdvice',
    'TLDR',
    'MainSummary',
    'Description',
    'Transcript',
    'DetailedNarrativeFlow',
    'MemorableQuotes',
    'MemorableTakeaways',
    'KeyNumbersData',
    'KeyExamples',
    'BookMediaRecommendations',
    'RelatedURLs',
    'VideoGenre',
    'Persons',
    'Companies',
    
    
    'InvestableAssets',
    'Ticker',
    
    
    'DOIs',
    'Hashtags',
    'MainTopic',
    'PrimarySources',
    'Sentiment',
    'SentimentReason',
    'Channel',
    'TechnicalTerms',
    'Speaker',
    
  ];

  
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
            {detailFieldOrder.map((fieldKey: keyof Video) => {
              let originalValue: Video[keyof Video] = currentVideo[fieldKey];
              const label = formatFieldName(String(fieldKey));

              // 1. Handle literal empty objects
              if (typeof originalValue === 'object' && originalValue !== null && !Array.isArray(originalValue) && Object.keys(originalValue).length === 0) {
                originalValue = null;
              }

              // 2. Skip rendering if value is essentially empty
              if (originalValue === null || originalValue === undefined ||
                 (typeof originalValue === 'string' && originalValue.trim() === '') ||
                 (Array.isArray(originalValue) && originalValue.length === 0)
              ) {
                return null;
              }

              // 3. Determine rendering flags based on originalValue
              const isImg = fieldKey === 'ThumbHigh'; // Expects string URL
              const isLnk = fieldKey === 'URL' || 
                            (fieldKey === 'RelatedURLs' && Array.isArray(originalValue) && originalValue.every(item => typeof item === 'string' && item.startsWith('http'))); // Expects array of string URLs
              const isArr = Array.isArray(originalValue);
              const isMd = MARKDOWN_FIELDS.includes(String(fieldKey)) ||
                           fieldKey === 'Description' ||
                           fieldKey === 'Transcript' ||
                           (typeof originalValue === 'string' && originalValue.length > 100 && !isLnk && !isImg);

              let displayValue = originalValue;

              // 4. Sanitize: If originalValue was an object (and not an array, and not already handled as an image/link URL string), stringify it.
              if (typeof originalValue === 'object' && originalValue !== null && !isArr) {
                if (!isImg && !isLnk) { 
                  // It's a generic object not handled as a special string type (image/link URL)
                  console.warn(`[VideoDetailPageContent] Field '${String(fieldKey)}' is an object and will be stringified. Value:`, originalValue);
                  displayValue = JSON.stringify(originalValue, null, 2);
                } else if (typeof originalValue !== 'string') {
                  // It was flagged as isImg or isLnk, but originalValue is not a string (it's an object).
                  // This indicates a data issue or an unexpected object structure for an img/link field.
                  console.warn(`[VideoDetailPageContent] Field '${String(fieldKey)}' flagged as img/lnk but is an object. Stringifying. Value:`, originalValue);
                  displayValue = JSON.stringify(originalValue, null, 2);
                }
                // If it was isImg or isLnk AND originalValue was already a string, displayValue correctly remains that string.
              }
              
              let isInitiallyCollapsed = true;
              const initiallyExpandedFields = ['ThumbHigh', 'URL', 'ActionableAdvice', 'TLDR', 'MainSummary', 'Description', 'Transcript'];
              if (initiallyExpandedFields.includes(String(fieldKey))) {
                isInitiallyCollapsed = false;
              }

              return (
                <DetailItem
                  key={String(fieldKey)}
                  label={label}
                  value={displayValue as FieldValue} // Pass the sanitized displayValue
                  isInitiallyCollapsed={isInitiallyCollapsed}
                  isMarkdown={isMd} // isMd is based on originalValue's nature
                  isImage={isImg && typeof displayValue === 'string'} // Only treat as image if displayValue is a string (URL)
                  isLink={isLnk && (typeof displayValue === 'string' || (Array.isArray(displayValue) && displayValue.every(item => typeof item === 'string')))} // Link can be string or array of strings
                  isList={isArr && !isLnk && !isImg && !isMd} // isList also based on originalValue's nature (being an array)
                />
              );
            })}
            {}
            {}
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
            
            {}
            <div className="p-4 bg-neutral-800 rounded-lg shadow text-xs text-neutral-400 space-y-1">
                {currentVideo.VideoID && <p>Video ID: <span className="font-mono">{currentVideo.VideoID}</span></p>}
                {currentVideo.CreatedAt && <p>Created: {new Date(currentVideo.CreatedAt).toLocaleString()}</p>}
                {currentVideo.UpdatedAt && <p>Last Updated: {new Date(currentVideo.UpdatedAt).toLocaleString()}</p>}
                {currentVideo.PublishedAt && <p>Published: {new Date(currentVideo.PublishedAt).toLocaleString()}</p>}
            </div>

            {/* Rework Summary Action Card */}
            <div className="p-4 bg-neutral-800 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-3 text-neutral-300">Rework Summary</h3>
              <button
                onClick={handleReworkSummary}
                className="w-full px-4 py-2.5 text-sm font-medium rounded-md bg-yellow-600 hover:bg-yellow-500 text-white transition-colors flex items-center justify-center"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <ChevronDown className="animate-spin h-5 w-5 mr-2" /> Processing...
                  </>
                ) : (
                  <>
                    <AlertTriangle size={18} className="mr-2" /> Mark as Reworked (Clear Narrative)
                  </>
                )}
              </button>
              <p className="text-xs text-neutral-400 mt-2">
                This will clear the &apos;Detailed Narrative Flow&apos; field. This action is useful if you plan to regenerate or significantly revise this section.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoDetailPageContent;

