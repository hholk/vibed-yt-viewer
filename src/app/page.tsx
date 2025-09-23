import { fetchVideos, type VideoListItem, videoListItemSchema, type PageInfo } from "@/features/videos/api/nocodb";
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert';
import { Terminal } from 'lucide-react';
import { VideoListClient } from '@/features/videos/components';
import { SearchComponent } from '@/shared/components/search-component';

export default async function HomePage({ searchParams: searchParamsPromise }: { searchParams: Promise<{ sort?: string; [key: string]: string | string[] | undefined }> }) {
  let videos: VideoListItem[] = [];
  let error: string | null = null;
  let pageInfo: PageInfo | null = null;
  let resolvedSearchParams: { sort?: string; [key: string]: string | string[] | undefined } | null = null;

  try {
    resolvedSearchParams = await searchParamsPromise;
    const sortParam = resolvedSearchParams.sort;
    const currentSort = typeof sortParam === 'string' ? sortParam : '-CreatedAt';

    // Only fetch the first page (25 items) for faster initial load
    const fetchedVideosData = await fetchVideos({
      sort: currentSort,
      limit: 25, // Reduced from 50 to 25 for faster initial load
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
        'CreatedAt',
      ],
      schema: videoListItemSchema,
    });

    videos = fetchedVideosData.videos;
    pageInfo = fetchedVideosData.pageInfo;

    // Debug logging
    console.log('Server-side debug:', {
      videosCount: videos.length,
      pageInfo: pageInfo,
      hasNextPage: pageInfo?.hasNextPage,
      totalRows: pageInfo?.totalRows
    });

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
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-mono text-brand">Video Collection</h1>
        <div className="text-sm text-muted-foreground">
          {pageInfo?.totalRows || 0} total videos
        </div>
      </div>

      {/* Search Component */}
      <SearchComponent initialVideos={videos} />

      {/* Original Video List (shown when no search is active) */}
      <div id="video-list-section" className="hidden">
        <VideoListClient
          videos={videos}
          pageInfo={pageInfo}
          initialSort={resolvedSearchParams?.sort || '-CreatedAt'}
        />
      </div>
    </div>
  );
}
