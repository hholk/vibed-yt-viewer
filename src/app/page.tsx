import { fetchAllVideos, type VideoListItem, videoListItemSchema } from "@/features/videos/api/nocodb";
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert';
import { Terminal } from 'lucide-react';
import { VideoListClient } from '@/features/videos/components';

export default async function HomePage({ searchParams: searchParamsPromise }: { searchParams: Promise<{ sort?: string; [key: string]: string | string[] | undefined }> }) {
  let videos: VideoListItem[] = [];
  let error: string | null = null;

  try {
    const resolvedSearchParams = await searchParamsPromise;
    const sortParam = resolvedSearchParams.sort;
    const currentSort = typeof sortParam === 'string' ? sortParam : '-CreatedAt'; 
    
    const fetchedVideosData = await fetchAllVideos({
      sort: currentSort,
      fields: [
        'Id',
        'rowId',
        'Title',
        'ThumbHigh',
        'Channel',
        'Description',
        'VideoGenre',
        'VideoID',
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
        'TechnicalTerms',
        'Speaker',
      ],
      schema: videoListItemSchema,
    });
    videos = fetchedVideosData;
    
  } catch (e: unknown) {
    console.error('Failed to fetch videos:', e);
    error = e instanceof Error ? e.message : 'An unknown error occurred while fetching videos.';
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error Fetching Videos</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!videos || videos.length === 0) {
    return (
      <div className="container mx-auto p-4">
        <Alert>
          <Terminal className="h-4 w-4" />
          <AlertTitle>No Videos Found</AlertTitle>
          <AlertDescription>
            There are currently no videos to display. Check back later or add some via NocoDB.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-6 text-3xl font-bold font-mono text-brand">Video Collection</h1>
      <VideoListClient videos={videos} />
    </div>
  );
}
