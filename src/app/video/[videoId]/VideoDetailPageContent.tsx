'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Edit3, ChevronDown, ChevronRight, ChevronLeft, ArrowLeft, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { Video, VideoListItem } from '@/lib/nocodb';
import { updateVideo } from '@/lib/nocodb';
import { StarRating } from '@/components/StarRating';

// Re-export the types for convenience
export type { Video, VideoListItem } from '@/lib/nocodb';

// Create a type-safe wrapper for ReactMarkdown
type SafeReactMarkdownProps = {
  children: string;
};
const SafeReactMarkdown = ({ children }: SafeReactMarkdownProps) => {
  return <ReactMarkdown>{children}</ReactMarkdown>;
};

// Define a general type for field values
type FieldValue = string | number | boolean | Date | string[] | Record<string, unknown> | Record<string, unknown>[] | null | undefined;

interface VideoDetailPageContentProps {
  video: Video;
  allVideos: VideoListItem[]; // Kept for potential future use or other functionalities
  previousVideo?: { Id: string; Title: string | null } | null;
  nextVideo?: { Id: string; Title: string | null } | null;
}

// Helper to format field names (e.g., DetailedNarrativeFlow -> Detailed Narrative Flow)
const formatFieldName = (fieldName: string): string => {
  return fieldName
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/_/g, ' ')        // Replace underscores with spaces
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase()); // Capitalize first letter
};

// List of fields that should be rendered as markdown
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

// Component to render a single collapsible detail item
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
  isMarkdown = false, // This prop will now be used directly
  isInitiallyCollapsed
}) => {
  // Get the collapsed state from localStorage if it exists
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return isInitiallyCollapsed ?? true; // SSR fallback
    // Prioritize isInitiallyCollapsed if provided
    if (isInitiallyCollapsed !== undefined) {
      return isInitiallyCollapsed;
    }
    const savedState = localStorage.getItem(`collapsed_${label}`);
    return savedState ? JSON.parse(savedState) : true; // Default to true (collapsed) if nothing else specifies
  });

  // Save collapsed state to localStorage when it changes
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
    
    if (isMarkdown && typeof value === 'string') { // Use the isMarkdown prop directly
      return (
        <div className="prose prose-invert prose-neutral prose-sm max-w-none markdown-box">
          <SafeReactMarkdown>
            {value}
          </SafeReactMarkdown>
        </div>
      );
    }

    if (isImage && typeof value === 'string' && value) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={value} alt={label} className="max-w-xs max-h-48 object-contain rounded-md my-2" />;
    }

    if (isLink && typeof value === 'string' && value) {
      return <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline truncate block max-w-full">{value}</a>;
    }

    if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
      // Format date consistently on both server and client
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
      // Special handling for Transcript field with WebVTT format
      if (label === 'Transcript' && value) {
        // Safely handle the value which could be string or unknown type
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

  // Don't render the component at all if the value is empty
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

// Define constant arrays outside the component to prevent recreation on each render
// const ARRAY_FIELDS = [
//   'Indicators', 'Trends', 'InvestableAssets', 'Institutions', 'EventsFairs', 
//   'DOIs', 'Hashtags', 'PrimarySources', 'AuthorsCreators', 'TagsCategories', 
//   'TargetDemographics', 'KeyPeople', 'CompaniesMentioned', 'ReferencedPapersBooks',
//   'ToolsSoftwareMentioned', 'FurtherReadingWatchLater' 
//   // Add any other known array fields from your schema
// ];
// const BOOLEAN_FIELDS = [
//   'IsPublic', 'IsNew', 'HasCaptions', 'IsShort', 'IsSyndicated', 'RequiresSubscription',
//   'LoginRequired', 'PaymentRequired'
//   // Add any other known boolean fields
// ];
// const NUMERIC_FIELDS = [
//   'Views', 'Likes', 'Dislikes', 'CommentCount', 'DurationSec', 
//   'PracticalityRating', 'NoveltyRating', 'TechnicalDepthRating', 'ImpactRating', 'EngagementRating',
//   'ComplexityRating', 'OverallRating'
//   // Add any other known numeric fields, ensure ImportanceRating is here if used as numeric
// ];

export function VideoDetailPageContent({
  video,
  // allVideos, // Kept for potential future use or other functionalities
  previousVideo,
  nextVideo,
}: VideoDetailPageContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentVideo, setCurrentVideo] = useState<Video>(video);
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [personalComment, setPersonalComment] = useState(video.PersonalComment || '');
  const [isSaving, setIsSaving] = useState(false); // General saving state
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // Specific state for ImportanceRating to handle its star display and updates
  const [activeImportanceRating, setActiveImportanceRating] = useState<number | null>(video.ImportanceRating || null);
  
  // States for inline editing of various fields
  // const [editStates, setEditStates] = useState<Record<string, boolean>>({});
  // const [tempEditValues, setTempEditValues] = useState<Record<string, FieldValue>>({});
  // const [showAllFields, setShowAllFields] = useState(false);


  useEffect(() => {
    setCurrentVideo(video);
    setPersonalComment(video.PersonalComment || '');
    setIsEditingComment(false);
    setSaveError(null);
    setActiveImportanceRating(video.ImportanceRating || null);
    // Reset inline editing states when video changes
    // setEditStates({});
    // setTempEditValues({});
  }, [video]);

  // Client-side pre-fetching for next/previous videos
  useEffect(() => {
    const currentQuery = searchParams.toString();
    const queryString = currentQuery ? `?${currentQuery}` : '';

    if (previousVideo?.Id) {
      router.prefetch(`/video/${previousVideo.Id}${queryString}`);
    }
    if (nextVideo?.Id) {
      router.prefetch(`/video/${nextVideo.Id}${queryString}`);
    }
  }, [previousVideo, nextVideo, router, searchParams]);

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

  const handleSaveComment = async () => {
    if (!currentVideo?.Id) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const updatedFields = { PersonalComment: personalComment };
      await updateVideo(currentVideo.Id, updatedFields);
      setCurrentVideo(prev => ({ ...prev!, ...updatedFields }));
      setIsEditingComment(false);
    } catch (error) {
      console.error('Failed to save comment:', error);
      setSaveError(error instanceof Error ? error.message : 'An unknown error occurred.');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Generic handler for saving star ratings
  const handleRatingChange = async (newRating: number | null, field: keyof Video) => {
    if (!currentVideo?.Id) return;

    // Update the specific rating state if one exists (e.g. for ImportanceRating)
    if (field === 'ImportanceRating') {
      setActiveImportanceRating(newRating);
    }
    // Add similar blocks for other specific rating fields if needed

    setIsSaving(true); 
    setSaveError(null);
    try {
      const updatedFields = { [field]: newRating };
      await updateVideo(currentVideo.Id, updatedFields);
      setCurrentVideo(prev => ({ ...prev!, ...updatedFields as Partial<Video> }));
    } catch (error) {
      console.error(`Failed to save ${field}:`, error);
      setSaveError(error instanceof Error ? error.message : `Failed to save ${String(field)}.`);
      // Revert optimistic update if save fails
      if (field === 'ImportanceRating') {
        setActiveImportanceRating(currentVideo.ImportanceRating || null);
      }
      // Add similar reversions for other specific rating fields
    } finally {
      setIsSaving(false);
    }
  };

  // Handlers for inline editing (currently commented out to disable functionality)
  // const handleEditField = (field: string) => {
  //   setTempEditValues(prev => ({ ...prev, [field]: currentVideo[field as keyof Video] }));
  //   // setEditStates(prev => ({ ...prev, [field]: true }));
  // };

  // const handleCancelEdit = (field: string) => {
  //   // setEditStates(prev => ({ ...prev, [field]: false }));
  //   setTempEditValues(prev => {
  //     const { [field]: _, ...rest } = prev;
  //     return rest;
  //   });
  //   setSaveError(null); // Clear general save error when canceling specific field edit
  // };

  // const handleSaveField = async (field: string) => {
  //   if (tempEditValues[field] === undefined) return; // Nothing to save or field not in edit mode

  //   setIsSaving(true);
  //   setSaveError(null);
  //   try {
  //     await updateVideo(currentVideo.Id, { [field]: tempEditValues[field] });
  //     setCurrentVideo(prev => ({ ...prev!, [field]: tempEditValues[field] }));
  //     // setEditStates(prev => ({ ...prev, [field]: false }));
  //     setTempEditValues(prev => {
  //       const { [field]: _, ...rest } = prev;
  //       return rest;
  //     });
  //   } catch (error) {
  //     console.error(`Error updating ${field}:`, error);
  //     setSaveError(`Failed to update ${field}.`);
  //   } finally {
  //     setIsSaving(false);
  //   }
  // };

  // const handleTempEditValueChange = (field: string, newValue: FieldValue) => {
  //   setTempEditValues(prev => ({ ...prev, [field]: newValue }));
  // };

  // Define the desired order of fields for the main detail section
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
    // 'Indicators', // Example of a field that might be an array, handled by isArr directly
    // 'Trends',
    'InvestableAssets',
    'Ticker',
    // 'Institutions',
    // 'EventsFairs',
    'DOIs',
    'Hashtags',
    'MainTopic',
    'PrimarySources',
    'Sentiment',
    'SentimentReason',
    'Channel',
    'TechnicalTerms',
    'Speaker',
    // Fields like VideoID, CreatedAt, UpdatedAt will be shown in the right column or if explicitly added here
  ];

  // Loading state check
  if (!currentVideo) {
    return (
      <div className="container mx-auto p-4 min-h-screen flex items-center justify-center">
        <p className="text-xl text-neutral-400">Loading video details...</p>
      </div>
    );
  }

  // Main component rendering
  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-50 p-4 md:p-8 font-plex-sans">
      <div className="container mx-auto max-w-5xl">
        {/* Back to List Link & Navigation Buttons */}
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

        {/* Video Title - Placed above the two-column grid */}
        <h1 className="text-3xl font-semibold mb-4 text-neutral-100 break-words hyphens-auto" title={currentVideo.Title || 'Video Title'}>
          {currentVideo.Title || 'Untitled Video'}
        </h1>
        
        {/* Save Error Display */}
        {saveError && (
          <div className="mb-4 p-3 bg-red-700/30 border border-red-600 text-red-300 rounded-md flex items-center">
            <AlertTriangle size={20} className="mr-2" />
            <span>Error: {saveError}</span>
          </div>
        )}

        {/* Main Content Grid - Two Columns */} 
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Video Details (Iterating based on detailFieldOrder) */}
          <div className="md:col-span-2 space-y-4">
            {detailFieldOrder.map((fieldKey: keyof Video) => {
              let value = currentVideo[fieldKey]; // Changed to let to allow modification
              const label = formatFieldName(String(fieldKey));

              // Convert empty object to null to conform to FieldValue type and simplify checks
              if (typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length === 0) {
                value = null;
              }

              if (value === null || value === undefined || 
                 (typeof value === 'string' && value.trim() === '') ||
                 (Array.isArray(value) && value.length === 0)
              ) {
                return null; // Skip rendering empty or null fields
              }

              let isInitiallyCollapsed = true;
              const initiallyExpandedFields = ['ThumbHigh', 'URL', 'ActionableAdvice', 'TLDR', 'MainSummary', 'Description', 'Transcript'];
              if (initiallyExpandedFields.includes(String(fieldKey))) {
                isInitiallyCollapsed = false;
              }
              
              const isImg = fieldKey === 'ThumbHigh';
              const isLnk = fieldKey === 'URL' || (fieldKey === 'RelatedURLs' && Array.isArray(value) && value.every(item => typeof item === 'string' && item.startsWith('http')));
              const isMd = MARKDOWN_FIELDS.includes(String(fieldKey)) || fieldKey === 'Description' || fieldKey === 'Transcript' || (typeof value === 'string' && String(value).length > 100 && !isLnk && !isImg); // Heuristic for markdown
              const isArr = Array.isArray(value);

              return (
                <DetailItem
                  key={String(fieldKey)}
                  label={label}
                  value={value}
                  isInitiallyCollapsed={isInitiallyCollapsed}
                  isMarkdown={isMd}
                  isImage={isImg}
                  isLink={isLnk}
                  isList={isArr && !isLnk && !isImg && !isMd} // Don't render markdown as list by default
                />
              );
            })}
            {/* Optional: Button to show/hide more fields if detailFieldOrder gets too long */}
            {/* <button 
              onClick={() => setShowAllFields(!showAllFields)}
              className="w-full mt-4 px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded-md transition-colors"
            >
              {showAllFields ? 'Show Fewer Details' : 'Show More Details'}
            </button> */}
          </div>

          {/* Right Column: Metadata, Comments, Ratings (Preserving existing structure) */}
          <div className="md:col-span-1 space-y-6">
            {/* Importance Rating Section */}
            <div className="p-4 bg-neutral-800 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2 text-neutral-300">Importance Rating</h3>
              <StarRating
                value={activeImportanceRating ?? 0}
                onChange={(newRating: number) => handleRatingChange(newRating, 'ImportanceRating')}
                size={28}
                readOnly={isSaving}
              />
            </div>

            {/* Personal Comment Section */}
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
            
            {/* Other metadata fields */}
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
