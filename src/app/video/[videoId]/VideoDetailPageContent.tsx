'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Edit3, ChevronDown, ChevronRight, ChevronLeft, ArrowLeft, AlertTriangle, Copy, Trash2, XCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { Video, VideoListItem } from '@/lib/nocodb';
import { updateVideo, deleteVideo } from '@/lib/nocodb';
import { StarRating } from '@/components/StarRating';

export type { Video, VideoListItem } from '@/lib/nocodb';

type SafeReactMarkdownProps = {
  children: string;
};
// Function to clean up markdown content
const cleanMarkdownContent = (content: string): string => {
  if (!content) return content;
  
  // Handle JSON array format (e.g., ["- quote1", "- quote2"])
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      // Clean each item in the array and join with double newlines
      return parsed
          .map(item => {
            // Remove any leading/trailing quotes and whitespace
            const cleanItem = String(item).trim()
              .replace(/^["']|["']$/g, '')  // Remove surrounding quotes
              .replace(/^\s*-\s*/, '')       // Remove leading bullet point
              .trim();
            return cleanItem;
          })
        .filter(Boolean) // Remove any empty strings
        .join('\n\n');
    }
  } catch {
    // Not a JSON string, continue with other cleaning
  }
  
  // Clean up the content if it's not a JSON array
  return content
    .replace(/^\s*\[\s*/g, '')        // Remove opening [
    .replace(/\s*\]\s*$/g, '')        // Remove closing ]
    .replace(/"\s*,\s*"/g, '\n')     // Replace "," with newlines
    .replace(/[\r\n]+/g, '\n')        // Normalize line endings
    .split('\n')                      // Split into lines
    .map(line => 
      line
        .replace(/^\s*["-]\s*/, '')  // Remove leading "- or -
        .replace(/^\s*\d+\.?\s*/, '') // Remove leading numbers like "1. "
        .replace(/"$/g, '')           // Remove trailing quotes
        .trim()
    )
    .filter(Boolean)                  // Remove empty lines
    .join('\n\n')                    // Join with double newlines
    .replace(/\n{3,}/g, '\n\n')       // Normalize multiple newlines
    .trim();
};

const SafeReactMarkdown = ({ children }: SafeReactMarkdownProps) => {
  const cleanedContent = cleanMarkdownContent(children);
  return <ReactMarkdown>{cleanedContent}</ReactMarkdown>;
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
  isMarkdown?: boolean;
  isInitiallyCollapsed?: boolean;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void;
}

const DetailItem = React.memo<DetailItemProps>(({ 
  label,
  value,
  isLink = false,
  isImage = false,
  isMarkdown = false,
  isInitiallyCollapsed,
  draggable = false,
  onDragStart,
  onDragOver,
  onDrop
}) => {
  
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true; 
    
    // Always check localStorage first for user's last preference
    const savedState = localStorage.getItem(`collapsed_${label}`);
    if (savedState !== null) {
      return JSON.parse(savedState);
    }
    
    // Fall back to the initial collapsed state if no saved preference exists
    return isInitiallyCollapsed ?? true;
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
    
    // Handle array values first
    if (Array.isArray(value) || (typeof value === 'string' && value.trim().startsWith('['))) {
      let items: string[] = [];
      
      // If it's already an array, use it directly
      if (Array.isArray(value)) {
        items = value.map(item => 
          typeof item === 'object' && item !== null && 'Title' in item 
            ? String((item as { Title: string }).Title)
            : String(item)
        );
      } 
      // If it's a string that looks like a JSON array, try to parse it
      else if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            items = parsed.map(String);
          } else {
            items = [String(parsed)];
          }
        } catch {
          // If parsing fails, treat it as a regular string
          items = [value];
        }
      }
      
      // Clean up each item
      items = items.map(item => 
        item
          .replace(/^\s*[\[\]"\-]\s*/, '')  // Remove leading [ " - characters
          .replace(/[\]"\-]\s*$/, '')       // Remove trailing ] " - characters
          .trim()
      );
      
      // If we're in markdown mode, join with double newlines
      if (isMarkdown) {
        return (
          <div className="prose prose-invert prose-neutral prose-sm max-w-none markdown-box">
            <SafeReactMarkdown>
              {items.join('\n\n')}
            </SafeReactMarkdown>
          </div>
        );
      }
      
      // Otherwise render as a list
      return (
        <ul className="list-disc pl-5 space-y-1">
          {items.map((item, index) => (
            <li key={index} className="text-neutral-200">
              {item}
            </li>
          ))}
        </ul>
      );
    }
    
    // Handle markdown content
    if (isMarkdown && typeof value === 'string') { 
      return (
        <div className="prose prose-invert prose-neutral prose-sm max-w-none markdown-box">
          <SafeReactMarkdown>
            {value}
          </SafeReactMarkdown>
        </div>
      );
    }

    // Handle images
    if (isImage && typeof value === 'string' && value) {
      return (
        <Image
          src={value}
          alt={label}
          width={320}
          height={180}
          unoptimized
          className="max-w-xs max-h-48 object-contain rounded-md my-2"
        />
      );
    }

    // Handle links
    if (isLink && typeof value === 'string' && value) {
      return <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline truncate block max-w-full">{value}</a>;
    }

    // Handle dates
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

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    let text = '';
    if (typeof value === 'string') {
      text = value;
    } else if (Array.isArray(value)) {
      text = value.join('\n');
    } else if (value) {
      text = JSON.stringify(value, null, 2);
    }
    if (text) {
      navigator.clipboard.writeText(text);
    }
  };

  return (
    <div
      className={`mb-3 last:mb-0 bg-neutral-800/50 p-3 rounded-lg shadow-sm ${draggable ? 'cursor-move' : ''}`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <button
        onClick={toggleCollapse}
        className="w-full flex justify-between items-center cursor-pointer list-none p-0 bg-transparent border-none"
        aria-expanded={!isCollapsed}
      >
        <span className="text-xs font-medium text-neutral-400 hover:text-neutral-300 transition-colors">
          {formatFieldName(label)}
        </span>
        <div className="flex items-center space-x-2 text-neutral-500 hover:text-neutral-300 transition-colors">
          {isMarkdown && (
            <Copy className="h-4 w-4" onClick={handleCopy} />
          )}
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
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [personalComment, setPersonalComment] = useState(video.PersonalComment || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDangerZoneOpen, setIsDangerZoneOpen] = useState(false);

  // Handler to clear DetailedNarrativeFlow
  const handleClearNarrative = async () => {
    if (!currentVideo?.Id) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await updateVideo(currentVideo.Id, { DetailedNarrativeFlow: null });
      setCurrentVideo(prev => ({ ...prev!, DetailedNarrativeFlow: null })); // No alert, UI will update
    } catch (error) {
      console.error('Failed to clear narrative:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to clear narrative.');
      alert('Failed to clear narrative. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteVideo = async () => {
    if (!currentVideo?.Id) return;
    if (!window.confirm('Delete this video entry? This action cannot be undone.')) {
      return;
    }
    setIsDeleting(true);
    setSaveError(null);
    try {
      await deleteVideo(currentVideo.Id);
      // No alert, will redirect
      router.push('/');
    } catch (error) {
      console.error('Failed to delete video:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to delete video.');
      alert('Failed to delete video. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  
  const [activeImportanceRating, setActiveImportanceRating] = useState<number | null>(video.ImportanceRating || null);
  
  
  
  
  

  useEffect(() => {
    setCurrentVideo(video);
    setPersonalComment(video.PersonalComment || '');
    setIsEditingComment(false);
    setSaveError(null);
    setActiveImportanceRating(video.ImportanceRating || null);
    
    
    
  }, [video]);

  
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
  
  
  const handleRatingChange = async (newRating: number | null, field: keyof Video) => {
    if (!currentVideo?.Id) return;

    
    if (field === 'ImportanceRating') {
      setActiveImportanceRating(newRating);
    }
    

    setIsSaving(true); 
    setSaveError(null);
    try {
      const updatedFields = { [field]: newRating };
      await updateVideo(currentVideo.Id, updatedFields);
      setCurrentVideo(prev => ({ ...prev!, ...updatedFields as Partial<Video> }));
    } catch (error) {
      console.error(`Failed to save ${field}:`, error);
      setSaveError(error instanceof Error ? error.message : `Failed to save ${String(field)}.`);
      
      if (field === 'ImportanceRating') {
        setActiveImportanceRating(currentVideo.ImportanceRating || null);
      }
      
    } finally {
      setIsSaving(false);
    }
  };

  
  
  
  
  

  
  
  
  
  
  
  
  

  
  

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  

  
  
  

  
  const DEFAULT_FIELD_ORDER: (keyof Video)[] = [
    'ThumbHigh',
    'URL',
    'MainTopic',
    'TLDR',
    'MainSummary',
    'KeyExamples',
    'KeyNumbersData',
    'ActionableAdvice',
    'DetailedNarrativeFlow',
    'MemorableQuotes',
    'MemorableTakeaways',
    'BookMediaRecommendations',
    'RelatedURLs',
    'VideoGenre',
    'Persons',
    'Companies',
    'Indicators',
    'Trends',
    'InvestableAssets',
    'Ticker',
    'Institutions',
    'EventsFairs',
    'DOIs',
    'Hashtags',
    'PrimarySources',
    'Sentiment',
    'SentimentReason',
    'Description',
    'TechnicalTerms',
    'Speaker',
    'Transcript'
  ];

  const [fieldOrder, setFieldOrder] = useState<(keyof Video)[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('detailFieldOrder');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            return parsed as (keyof Video)[];
          }
        } catch {}
      }
    }
    return DEFAULT_FIELD_ORDER;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('detailFieldOrder', JSON.stringify(fieldOrder));
    }
  }, [fieldOrder]);

  const dragFieldRef = useRef<keyof Video | null>(null);

  const handleDragStart = useCallback(
    (field: keyof Video) => (e: React.DragEvent<HTMLDivElement>) => {
      dragFieldRef.current = field;
      e.dataTransfer.effectAllowed = 'move';
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (field: keyof Video) => (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!dragFieldRef.current || dragFieldRef.current === field) return;
      const dragged = dragFieldRef.current;
      setFieldOrder(prev => {
        const newOrder = [...prev];
        const fromIndex = newOrder.indexOf(dragged);
        const toIndex = newOrder.indexOf(field);
        if (fromIndex >= 0 && toIndex >= 0) {
          newOrder.splice(fromIndex, 1);
          newOrder.splice(toIndex, 0, dragged);
        }
        return newOrder;
      });
      dragFieldRef.current = null;
    },
    []
  );
  
  // Get channel info if it exists
  const channelInfo = currentVideo.Channel ? {
    label: 'Channel',
    value: currentVideo.Channel,
    isLink: false
  } : null;

  
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {}
          <div className="md:col-span-2 space-y-4">
            {fieldOrder.map((fieldKey: keyof Video) => {
               let value = currentVideo[fieldKey];
               const label = formatFieldName(String(fieldKey));

               // Guard: if value is an empty object, set to null
               // This check is done immediately after value assignment to prevent passing empty objects to DetailItem
               if (typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length === 0 && value.constructor === Object) {
                 value = null;
               }

               if (value === null || value === undefined || 
                  (typeof value === 'string' && value.trim() === '') ||
                  (Array.isArray(value) && value.length === 0)
               ) {
                 return null; 
               }

               let isInitiallyCollapsed = true;
              const initiallyExpandedFields = ['ThumbHigh', 'URL', 'ActionableAdvice', 'TLDR', 'MainSummary'];
              if (initiallyExpandedFields.includes(String(fieldKey))) {
                isInitiallyCollapsed = false;
              }
              
              const isImg = fieldKey === 'ThumbHigh';
              const isLnk = fieldKey === 'URL' || (fieldKey === 'RelatedURLs' && Array.isArray(value) && value.every(item => typeof item === 'string' && item.startsWith('http')));
              const isMd = MARKDOWN_FIELDS.includes(String(fieldKey)) || fieldKey === 'Description' || fieldKey === 'Transcript' || (typeof value === 'string' && String(value).length > 100 && !isLnk && !isImg);

              // type assertion: all runtime guards in place
              // This assertion is done to ensure that value is of type FieldValue when passed to DetailItem
              return (
                <DetailItem
                  key={String(fieldKey)}
                  label={label}
                  value={value as FieldValue} 
                  isInitiallyCollapsed={isInitiallyCollapsed}
                  isMarkdown={isMd}
                  isImage={isImg}
                  isLink={isLnk}
                  draggable
                  onDragStart={handleDragStart(fieldKey)}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop(fieldKey)}
                />
              );
            })}
            {}
            {}
          </div>

          {/* Right sidebar */}
          <div className="md:col-span-1 space-y-6">
            {/* Channel info at the top */}
            {channelInfo && (
              <div className="p-4 bg-neutral-800 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-2 text-neutral-300">{channelInfo.label}</h3>
                <div className="text-neutral-300">
                  {channelInfo.isLink ? (
                    <a href={String(channelInfo.value)} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                      {String(channelInfo.value)}
                    </a>
                  ) : (
                    String(channelInfo.value)
                  )}
                </div>
              </div>
            )}
            
            {/* Importance Rating */}
            <div className="p-4 bg-neutral-800 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2 text-neutral-300">Importance Rating</h3>
              <StarRating
                value={activeImportanceRating ?? 0}
                onChange={(newRating: number) => handleRatingChange(newRating, 'ImportanceRating')}
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
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPersonalComment(e.target.value)}
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

            {/* Advanced Actions (Danger Zone) */}
            <div className="mt-4 pt-4 border-t border-neutral-700/60">
              <button
                onClick={() => setIsDangerZoneOpen(!isDangerZoneOpen)}
                className="w-full flex justify-between items-center py-2 text-sm font-medium text-neutral-400 hover:text-neutral-200 transition-colors"
                aria-expanded={isDangerZoneOpen}
              >
                <span className="flex items-center">
                  <AlertTriangle size={16} className="mr-2 text-yellow-500" />
                  Advanced Actions
                </span>
                {isDangerZoneOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </button>
              {isDangerZoneOpen && (
                <div className="mt-3 space-y-3">
                  {currentVideo.DetailedNarrativeFlow && (
                    <button
                      onClick={handleClearNarrative}
                      className="w-full flex items-center justify-center px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      aria-label="Clear Narrative"
                      disabled={isSaving || isDeleting}
                    >
                      <XCircle size={16} className="mr-2" />
                      {isSaving && !isDeleting ? 'Clearing Narrative...' : 'Clear Narrative'}
                    </button>
                  )}
                  <button
                    onClick={handleDeleteVideo}
                    className="w-full flex items-center justify-center px-4 py-2 bg-red-700 text-white rounded hover:bg-red-800 shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    aria-label="Delete Video"
                    disabled={isDeleting || isSaving}
                  >
                    <Trash2 size={16} className="mr-2" />
                    {isDeleting ? 'Deleting Video...' : 'Delete Video'}
                  </button>
                </div>
              )}
            </div>
            
            {}
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
