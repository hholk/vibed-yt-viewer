import { fetchVideos, type VideoListItem, videoListItemSchema, type PageInfo } from "@/features/videos/api/nocodb";
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert';
import { Terminal } from 'lucide-react';
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

    // Only fetch the first page (35 items) for faster initial load
    const fetchedVideosData = await fetchVideos({
      sort: currentSort,
      limit: 35, // Reduced to 35 for optimal initial load
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
      <div className="min-h-screen bg-neutral-900 text-neutral-50 p-4 md:p-8 font-plex-sans">
        <div className="container mx-auto max-w-5xl">
          <div className="mb-6 flex flex-wrap justify-between items-center gap-4">
            <h1 className="text-3xl font-semibold text-neutral-100">Video Collection</h1>
          </div>
          <Alert variant="destructive" className="bg-red-900/30 border-red-600 text-red-300">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Error Fetching Videos</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!videos || videos.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-900 text-neutral-50 p-4 md:p-8 font-plex-sans">
        <div className="container mx-auto max-w-5xl">
          <div className="mb-6 flex flex-wrap justify-between items-center gap-4">
            <h1 className="text-3xl font-semibold text-neutral-100">Video Collection</h1>
          </div>
          <Alert className="bg-neutral-800/50 border-neutral-600 text-neutral-300 p-4 rounded-lg">
            <Terminal className="h-4 w-4" />
            <AlertTitle>No Videos Found</AlertTitle>
            <AlertDescription>
              There are currently no videos to display. Check back later or add some via NocoDB.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-50 p-4 md:p-8 font-plex-sans">
      <div className="container mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap justify-between items-center gap-4">
          <h1 className="text-3xl font-semibold text-neutral-100 break-words hyphens-auto" title="Video Collection">
            Video Collection
          </h1>
          <div className="text-sm text-neutral-400">
            {pageInfo?.totalRows || 0} total videos
          </div>
        </div>

        {/* Search Component - styled like video page */}
        <div className="search-component-wrapper">
          <SearchComponent initialVideos={videos} />
        </div>
      </div>
    </div>
  );
}
