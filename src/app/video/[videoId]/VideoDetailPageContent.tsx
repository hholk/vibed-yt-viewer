'use client';

import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronDown, ChevronRight, ChevronLeft, Save, Edit, X, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { Video, VideoListItem } from '@/lib/nocodb';
import { updateVideo } from '@/lib/nocodb';
import { StarRating } from '@/components/StarRating';

// Re-export the types for convenience
export type { Video, VideoListItem } from '@/lib/nocodb';

type SafeReactMarkdownProps = {
  children: string;
};

// Create a type-safe wrapper for ReactMarkdown
const SafeReactMarkdown = ({ children }: SafeReactMarkdownProps) => {
  return <ReactMarkdown>{children}</ReactMarkdown>;
};

interface VideoDetailPageContentProps {
  video: Video;
  allVideos: VideoListItem[];
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

/**
 * Checks if a field should be rendered as markdown.
 * @param label The field label (case-insensitive, spaces/underscores ignored)
 */
function isMarkdownField(label: string): boolean {
  const normalized = label.replace(/[^a-zA-Z]/g, '').toLowerCase();
  return MARKDOWN_FIELDS.some(f => f.replace(/[^a-zA-Z]/g, '').toLowerCase() === normalized);
}

// Component to render a single collapsible detail item
interface DetailItemProps {
  label: string;
  value: unknown;
  className?: string;
  isLink?: boolean;
  isImage?: boolean;
  isList?: boolean;
  isDate?: boolean;
  isTags?: boolean;
  isRating?: boolean;
  isDescription?: boolean;
  isTranscript?: boolean;
  isCollapsible?: boolean;
  isInitiallyCollapsed?: boolean;
  onValueChange?: (value: string) => void;
  isEditable?: boolean;
  isSaving?: boolean;
  error?: string | null;
  children?: React.ReactNode;
}

const DetailItem = React.memo<DetailItemProps>(({ 
  label, 
  value, 
  className, 
  isLink = false, 
  isImage = false,
  isList = false,
  isDate = false,
  isTags = false,
  isRating = false,
  isDescription = false,
  isTranscript = false,
  isCollapsible = false,
  isInitiallyCollapsed = false,
  onValueChange,
  isEditable = false,
  isSaving = false,
  error = null,
  children,
}) => {
  // Get the collapsed state from localStorage if it exists
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return isInitiallyCollapsed;
    const savedState = localStorage.getItem(`collapsed_${label}`);
    return savedState ? JSON.parse(savedState) : isInitiallyCollapsed;
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
    
    if (isMarkdownField(label) && typeof value === 'string') {
      return (
        <div className="prose prose-invert prose-neutral prose-sm max-w-none markdown-box">
          <ReactMarkdown
            components={{
              blockquote({ node: _, ...props }) {
                return <blockquote className="border-l-4 border-neutral-600 pl-4 italic text-neutral-300 my-2" {...props} />;
              },
              code({ node: _, className, children, ...props }) {
                const isInline = !(className && className.includes('language-'));
                return isInline ? (
                  <code className="bg-neutral-800 px-1 rounded text-pink-400" {...props}>{children}</code>
                ) : (
                  <pre {...(props as React.HTMLAttributes<HTMLPreElement>)}><code className="bg-neutral-900 p-2 rounded-md overflow-x-auto text-xs">{children}</code></pre>
                );
              },
            }}
          >
            {value}
          </ReactMarkdown>
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
          {value.map((item, idx) => {
            const itemValue = item && typeof item === 'object' && 'Title' in item 
              ? (item as { Title: string }).Title 
              : String(item);
              
            return (
              <li key={idx} className={isLink ? 'text-blue-600 hover:underline' : ''}>
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

// Define constant arrays outside the component to prevent recreation on each render
const ARRAY_FIELDS = [
  'Indicators', 'Trends', 'InvestableAssets', 'Institutions',
  'EventsFairs', 'DOIs', 'Hashtags', 'PrimarySources',
  'TechnicalTerms', 'Speakers', 'KeyExamples', 'MemorableQuotes',
  'MemorableTakeaways', 'BookMediaRecommendations', 'RelatedURLs',
  'Persons', 'Companies'
];

export const VideoDetailPageContent = ({ video, allVideos }: VideoDetailPageContentProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get('sort') || '-CreatedAt';
  
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [personalComment, setPersonalComment] = useState(video.PersonalComment || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Update local state when video prop changes
  useEffect(() => {
    setPersonalComment(video.PersonalComment || '');
    setIsEditingComment(false);
  }, [video.Id]);

  const handleSaveComment = async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    setSaveError(null);
    
    try {
      await updateVideo(video.Id, { PersonalComment: personalComment });
      // Update the local video object to reflect the change
      video.PersonalComment = personalComment;
      setIsEditingComment(false);
      
      // Show a temporary success message
      const successMsg = setTimeout(() => {
        setSaveError(null);
      }, 3000);
      
      return () => clearTimeout(successMsg);
    } catch (error) {
      console.error('Failed to save comment:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save comment');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleCancelEdit = () => {
    // Reset to the original comment and exit edit mode
    setPersonalComment(video.PersonalComment || '');
    setSaveError(null);
    setIsEditingComment(false);
  };

  const handleStarRatingChange = async (rating: number) => {
    if (isSaving) return;
    
    setIsSaving(true);
    setSaveError(null);
    
    try {
      await updateVideo(video.Id, { ImportanceRating: rating });
    } catch (error) {
      console.error('Failed to update rating:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to update rating');
      setIsSaving(false);
    }
  }; 

  // Debug: Log video data to console
  useEffect(() => {
    console.log('Video data:', video);
    console.log('Transcript fields:', {
      FullTranscript: video.FullTranscript,
      Transcript: video.Transcript,
      hasFullTranscript: 'FullTranscript' in video,
      hasTranscript: 'Transcript' in video
    });
  }, [video]);
  
  // Find current video index in the sorted list
  const currentIndex = allVideos.findIndex(v => v.VideoID === video.VideoID);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < allVideos.length - 1;

  // Get previous and next videos for navigation
  const prevVideo = hasPrevious ? allVideos[currentIndex - 1] : undefined;
  const nextVideo = hasNext ? allVideos[currentIndex + 1] : undefined;

  // Prefetch next and previous video pages
  useEffect(() => {
    if (prevVideo) {
      router.prefetch(`/video/${prevVideo.VideoID}?sort=${currentSort}`);
    }
    if (nextVideo) {
      router.prefetch(`/video/${nextVideo.VideoID}?sort=${currentSort}`);
    }
  }, [prevVideo?.VideoID, nextVideo?.VideoID, currentSort, router]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft' && prevVideo) {
      router.push(`/video/${prevVideo.VideoID}?sort=${currentSort}`);
    } else if (e.key === 'ArrowRight' && nextVideo) {
      router.push(`/video/${nextVideo.VideoID}?sort=${currentSort}`);
    }
  }, [nextVideo?.VideoID, prevVideo?.VideoID, router, currentSort]);

  // Optimize the event listener effect
  useEffect(() => {
    const handler = (e: KeyboardEvent) => handleKeyDown(e);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleKeyDown]);

  const navigateToVideo = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && prevVideo) {
      router.push(`/video/${prevVideo.VideoID}?sort=${currentSort}`);
    } else if (direction === 'next' && nextVideo) {
      router.push(`/video/${nextVideo.VideoID}?sort=${currentSort}`);
    }
  };
  
  // Navigation buttons component
  const NavigationButtons = useMemo(() => {
    return (
      <div className="fixed top-4 left-0 right-0 z-10 flex items-center justify-between px-4 max-w-[33.6rem] mx-auto w-full">
        {prevVideo ? (
          <Link
            href={`/video/${prevVideo.VideoID}?sort=${currentSort}`}
            prefetch={true}
            className="flex items-center px-4 py-2 rounded-md text-sm transition-colors text-blue-400 hover:bg-neutral-700/90 hover:text-blue-300 bg-neutral-800/80 backdrop-blur-sm border border-neutral-700"
            aria-label="Previous video"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            <span>Previous</span>
          </Link>
        ) : (
          <button
            disabled
            className="flex items-center px-4 py-2 rounded-md text-sm text-neutral-600 cursor-not-allowed bg-neutral-800/80 backdrop-blur-sm border border-neutral-700"
            aria-label="No previous video"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            <span>Previous</span>
          </button>
        )}

        <Link 
          href={`/?sort=${currentSort}`} 
          className="flex items-center px-4 py-2 text-sm text-blue-400 hover:text-blue-300 bg-neutral-800/80 hover:bg-neutral-700/90 backdrop-blur-sm rounded-md border border-neutral-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to List
        </Link>

        {nextVideo ? (
          <Link
            href={`/video/${nextVideo.VideoID}?sort=${currentSort}`}
            prefetch={true}
            className="flex items-center px-4 py-2 rounded-md text-sm transition-colors text-blue-400 hover:bg-neutral-700/90 hover:text-blue-300 bg-neutral-800/80 backdrop-blur-sm border border-neutral-700"
            aria-label="Next video"
          >
            <span>Next</span>
            <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        ) : (
          <button
            disabled
            className="flex items-center px-4 py-2 rounded-md text-sm text-neutral-600 cursor-not-allowed bg-neutral-800/80 backdrop-blur-sm border border-neutral-700"
            aria-label="No next video"
          >
            <span>Next</span>
            <ChevronRight className="h-4 w-4 ml-1" />
          </button>
        )}
      </div>
    );
  }, [currentSort, nextVideo, prevVideo]);

  // Memoize the fields to display to prevent recreation on each render
  const fieldsToDisplayInOrder = useMemo((): (keyof Video)[] => [
    'ThumbHigh', // Displayed as 'Thumbnail'
    'URL', // Displayed as 'Video Link'
    'ActionableAdvice',
    'TLDR',
    'MainSummary',
    'KeyNumbersData',
    'KeyExamples',
    'DetailedNarrativeFlow',
    'MemorableQuotes',
    'MemorableTakeaways',
    'ImportanceRating',
    'PersonalComment',
    'BookMediaRecommendations',
    'RelatedURLs',
    'VideoGenre',
    'Persons',
    'Companies',
    'Indicators',
    'Trends',
    'InvestableAssets',
    'TickerSymbol',
    'Institutions',
    'EventsFairs',
    'DOIs',
    'Hashtags',
    'MainTopic',
    'PrimarySources',
    'Sentiment',
    'SentimentReason',
    'Channel',
    'Description',
    'TechnicalTerms',
    'Speakers',
    'CreatedAt',
    'UpdatedAt',
    'PublishedAt',
    'Transcript' // Using Transcript field instead of FullTranscript
  ], []);

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-50 p-4 md:p-8 font-plex-sans relative">
      {NavigationButtons}
      
      <div className="max-w-[33.6rem] mx-auto pt-20">
        <h1 className="font-plex-mono text-3xl md:text-4xl font-bold mb-1 text-neutral-100 break-words">
          {video.Title}
        </h1>
        {/* Display VideoID under the title, as it's in the collapsed section otherwise */}
        <p className="text-xs text-neutral-500 mb-6">Video ID: {video.VideoID}</p>

        <div className="space-y-1">
          {fieldsToDisplayInOrder.map((key) => {
            const value = video[key as keyof Video];
            let label = key as string;
            // Keep FullTranscript as is, we'll handle it specially
            if (key === 'ThumbHigh') label = 'Thumbnail';
            if (key === 'URL') label = 'Video Link';
            if (key === 'TickerSymbol') label = '$Ticker';
            if (key === 'VideoID') return null; // Already displayed under title
            if (key === 'Title') return null; // Already displayed as H1

            // Use the pre-defined ARRAY_FIELDS constant
            const isArrayField = ARRAY_FIELDS.includes(key as string);

            if (key === 'ImportanceRating') {
              return (
                <div className="mb-3 last:mb-0 bg-neutral-800/50 p-3 rounded-lg shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-neutral-400">
                      {formatFieldName(label)}
                    </span>
                    {isSaving && (
                      <span className="text-xs text-yellow-400">Saving...</span>
                    )}
                  </div>
                  <div className="mt-2 pl-1">
                    <StarRating 
                      value={video.ImportanceRating} 
                      onChange={handleStarRatingChange}
                    />
                  </div>
                </div>
              );
            }
            
            if (key === 'PersonalComment') {
              return (
                <div key="personal-comment" className="mb-3 last:mb-0 bg-neutral-800/50 p-3 rounded-lg shadow-sm transition-colors hover:bg-neutral-800/70">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-medium text-neutral-300">
                      {formatFieldName(key)}
                    </span>
                    {isEditingComment ? (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={handleSaveComment}
                          disabled={isSaving}
                          className="text-xs flex items-center px-2 py-1 rounded bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Save className="h-3 w-3 mr-1" />
                          {isSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={isSaving}
                          className="text-xs flex items-center px-2 py-1 rounded bg-neutral-600 hover:bg-neutral-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setSaveError(null);
                          setIsEditingComment(true);
                        }}
                        className="text-xs flex items-center px-2 py-1 rounded bg-neutral-700 hover:bg-neutral-600 text-white transition-colors"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        {video.PersonalComment ? 'Edit Note' : 'Add Note'}
                      </button>
                    )}
                  </div>
                  <div className="pl-1">
                    {isEditingComment ? (
                      <div className="space-y-2">
                        <textarea
                          value={personalComment}
                          onChange={(e) => setPersonalComment(e.target.value)}
                          className="w-full p-3 bg-neutral-700 text-white rounded border border-neutral-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          rows={5}
                          disabled={isSaving}
                          placeholder="Add your personal notes about this video..."
                          autoFocus
                        />
                        {saveError ? (
                          <p className="text-red-400 text-xs flex items-center">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            {saveError}
                          </p>
                        ) : (
                          <p className="text-xs text-neutral-400">
                            Your notes are saved automatically when you click Save.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div 
                        className={`whitespace-pre-wrap text-sm break-words p-2 rounded ${
                          !video.PersonalComment ? 'text-neutral-400 bg-neutral-800/30 p-4 text-center' : ''
                        }`}
                      >
                        {video.PersonalComment || 'Click "Add Note" to add your personal thoughts about this video.'}
                      </div>
                    )}
                  </div>
                </div>
              );
            }
            
            return (
              <DetailItem 
                key={key as string} 
                label={label as string} 
                value={value} 
                isInitiallyCollapsed={false}
                isLink={key === 'URL' || key === 'RelatedURLs'}
                isImage={key === 'ThumbHigh'}
                isList={ARRAY_FIELDS.includes(key as string) && Array.isArray(value)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
