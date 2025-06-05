
'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation'; 
import Link from 'next/link';
import Image from 'next/image';
import { type Video } from '@/lib/nocodb'; 
import { Badge } from '@/components/ui/badge';
import { Star, ArrowLeftCircle, ArrowRightCircle } from 'lucide-react';

export type NavVideo = {
  Id: number;
  VideoID: string;
  Title?: string | null;
  Channel?: string | null;
  ImportanceRating?: number | null;
  CreatedAt?: Date | null;
  UpdatedAt?: Date | null;
};

interface VideoDetailClientViewProps {
  video: Video;
  allVideos: NavVideo[]; 
  currentSort: string;
}

const renderBadgeList = (
  items: (string | { Title?: string | null; name?: string | null } | undefined)[] | null | undefined,
  label: string,
  variant: 'secondary' | 'outline' = 'secondary'
) => {
  if (!items || items.length === 0) return null;
  const validItems = items.filter(item => item && (typeof item === 'string' || item.Title || item.name));
  if (validItems.length === 0) return null;

  return (
    <div className="mb-4">
      <h3 className="text-md font-semibold text-muted-foreground mb-1.5">{label}</h3>
      <div className="flex flex-wrap gap-1">
        {validItems.map((item, index) => {
          
          const content = typeof item === 'string' ? item : (item?.Title || item?.name || '');
          return (
            <Badge key={index} variant={variant}>
              {content}
            </Badge>
          );
        })}
      </div>
    </div>
  );
};

const renderDetailItem = (label: string, value: React.ReactNode | string | number | null | undefined, className?: string) => {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) return null;
  return (
    <div className={`mb-4 ${className}`}>
      <h3 className="text-md font-semibold text-muted-foreground mb-0.5">{label}</h3>
      {typeof value === 'string' || typeof value === 'number' ? <p className="text-base text-foreground whitespace-pre-wrap">{value}</p> : value}
    </div>
  );
};

const renderStarRating = (rating: number | null | undefined) => {
  if (rating === null || rating === undefined) return renderDetailItem("Importance Rating", "Not Rated");
  return (
    <div className="mb-4">
      <h3 className="text-md font-semibold text-muted-foreground mb-0.5">Importance Rating</h3>
      <div className="flex items-center">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className={`h-5 w-5 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
        ))}
        <span className="ml-2 text-sm text-foreground">({rating}/5)</span>
      </div>
    </div>
  );
};

const renderStringList = (items: string[] | null | undefined, label: string) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="mb-4">
      <h3 className="text-md font-semibold text-muted-foreground mb-1">{label}</h3>
      <ul className="list-disc list-inside pl-2 space-y-0.5 text-base text-foreground">
        {items.map((item, idx) => <li key={idx}>{item}</li>)}
      </ul>
    </div>
  );
};

const renderUrlList = (items: string[] | null | undefined, label: string) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="mb-4">
      <h3 className="text-md font-semibold text-muted-foreground mb-1">{label}</h3>
      <ul className="list-disc list-inside pl-2 space-y-0.5 text-base text-foreground">
        {items.map((url, idx) => (
          <li key={idx}>
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline break-all">
              {url}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default function VideoDetailClientView({ video, allVideos, currentSort }: VideoDetailClientViewProps) {
  const router = useRouter();

  const currentIndex = useMemo(() => {
    return allVideos.findIndex(v => v.VideoID === video.VideoID);
  }, [allVideos, video.VideoID]);

  const prevVideo = useMemo(() => {
    return currentIndex > 0 ? allVideos[currentIndex - 1] : null;
  }, [allVideos, currentIndex]);

  const nextVideo = useMemo(() => {
    return currentIndex !== -1 && currentIndex < allVideos.length - 1 ? allVideos[currentIndex + 1] : null;
  }, [allVideos, currentIndex]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        if (prevVideo) {
          router.push(`/video/${prevVideo.VideoID}?sort=${currentSort}`);
        }
      } else if (event.key === 'ArrowRight') {
        if (nextVideo) {
          router.push(`/video/${nextVideo.VideoID}?sort=${currentSort}`);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [prevVideo, nextVideo, router, currentSort]);

  const formatDate = (dateString: Date | string | null | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };
  
  return (
    <div className="container mx-auto px-2 py-4 md:px-4 relative">
      <div className="fixed top-1/2 left-2 md:left-4 z-50 transform -translate-y-1/2">
        {prevVideo && (
          <Link href={`/video/${prevVideo.VideoID}?sort=${currentSort}`} title={`Previous: ${prevVideo.Title}`}
                className="p-2 bg-background/80 hover:bg-muted rounded-full shadow-lg backdrop-blur-sm transition-all">
            <ArrowLeftCircle className="h-8 w-8 md:h-10 md:w-10 text-foreground" />
          </Link>
        )}
      </div>
      <div className="fixed top-1/2 right-2 md:right-4 z-50 transform -translate-y-1/2">
        {nextVideo && (
          <Link href={`/video/${nextVideo.VideoID}?sort=${currentSort}`} title={`Next: ${nextVideo.Title}`}
                className="p-2 bg-background/80 hover:bg-muted rounded-full shadow-lg backdrop-blur-sm transition-all">
            <ArrowRightCircle className="h-8 w-8 md:h-10 md:w-10 text-foreground" />
          </Link>
        )}
      </div>

      <div className="max-w-4xl mx-auto">
        {renderDetailItem("Title", video.Title, "text-2xl md:text-3xl font-bold mb-3")}

        {video.ThumbHigh && (
          <div className="mb-6">
            <Image 
              src={video.ThumbHigh} 
              alt={`Thumbnail for ${video.Title}`}
              width={1280} 
              height={720}
              className="rounded-lg object-cover w-full h-auto shadow-xl border border-border"
              priority 
            />
          </div>
        )}
        
        {video.URL && renderDetailItem("Video URL", 
          <a href={video.URL} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline break-all">
            {video.URL}
          </a>
        )}

        {renderDetailItem("Actionable Advice", video.ActionableAdvice)}
        {renderDetailItem("TLDR; (Too Long; Didn't Read)", video.TLDR)}
        {renderDetailItem("Main Summary", video.MainSummary)}
        {renderDetailItem("Detailed Narrative Flow", video.DetailedNarrativeFlow)}

        {renderStringList(video.MemorableQuotes, "Memorable Quotes")}
        {renderStringList(video.MemorableTakeaways, "Memorable Takeaways")}
        
        {renderDetailItem("Key Numbers & Data", video.KeyNumbersData)}
        {renderDetailItem("Key Examples", video.KeyExamples)}

        {renderStarRating(video.ImportanceRating)}
        {renderDetailItem("Personal Comment", video.PersonalComment)}

        {renderStringList(video.BookMediaRecommandations, "Book/Media Recommendations")}
        {renderUrlList(video.URLs, "Associated URLs")}
        
        {renderDetailItem("Video Genre", video.VideoGenre)}

        {renderBadgeList(video.Persons, "Persons")}
        {renderBadgeList(video.Companies, "Companies")}
        {renderBadgeList(video.Indicators, "Indicators")}
        {renderBadgeList(video.Trends, "Trends")}
        {renderBadgeList(video.InvestableAssets, "Investable Assets")}
        {renderBadgeList(video.Ticker, "$Ticker")}
        {renderBadgeList(video.Institutions, "Institutions")}
        {renderStringList(video.EventsFairs, "Events/Fairs")}

        {video.DOIs && video.DOIs.length > 0 && (
          <div className="mb-4">
            <h3 className="text-md font-semibold text-muted-foreground mb-1">DOIs</h3>
            <ul className="list-disc list-inside pl-2 space-y-0.5 text-base text-foreground">
              {video.DOIs.map((doi, idx) => (
                <li key={idx}>
                  <a
                    href={`https://doi.org/${doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand hover:underline break-all"
                  >
                    {doi}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {renderBadgeList(video.Hashtags, "Hashtags")}
        {renderDetailItem("Main Topic", video.MainTopic)}
        {renderStringList(video.PrimarySources, "Primary Sources")}
        
        {renderDetailItem("Sentiment", video.Sentiment)}
        {renderDetailItem("Sentiment Reason", video.SentimentReason)}
        
        {renderDetailItem("Channel", video.Channel)}
        {renderDetailItem("Original Description", video.Description)} 
        
        {renderStringList(video.TechnicalTerms, "Technical Terms")}
        {renderDetailItem("Speaker(s)", video.Speaker || (Array.isArray(video.Speakers) && video.Speakers.map(s => s.Title || s.name).join(', ')) )}

        <div className="mt-8 pt-6 border-t border-border text-xs text-muted-foreground space-y-1">
            {renderDetailItem("NocoDB VideoID (for query)", video.VideoID, "mb-1")}
            <p>Record Created: {formatDate(video.CreatedAt)}</p>
            <p>Record Last Updated: {formatDate(video.UpdatedAt)}</p>
            {video.PublishedAt && <p>Originally Published: {formatDate(video.PublishedAt)}</p>}
        </div>

        {(video.FullTranscript || video.Transcript) && (
          <div className="mt-8 pt-6 border-t border-border">
            <div className="bg-muted/20 p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold text-foreground mb-4">
                {video.FullTranscript ? "Full Transcript" : "Transcript"}
              </h2>
              <div className="prose max-w-none text-foreground/90">
                <div className="space-y-4">
                  {(video.FullTranscript || video.Transcript)
                    .split('\n\n')
                    .filter(Boolean)
                    .map((block, index) => {
                      const [firstLine, ...rest] = block.split('\n');
                      const timeMatch = firstLine?.match(/\d{2}:\d{2}:\d{2},\d{3}/);
                      const text = rest.join(' ').trim();
                      
                      if (!text) return null;
                      
                      return (
                        <div key={index} className="group hover:bg-muted/30 rounded p-2 -mx-2 transition-colors">
                          {timeMatch && (
                            <div className="text-xs text-muted-foreground/80 mb-1">
                              {timeMatch[0].replace(',', '.')}
                            </div>
                          )}
                          <div className="text-sm leading-relaxed">
                            {text}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
