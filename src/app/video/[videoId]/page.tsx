import type { Metadata } from 'next';
import { fetchVideoByVideoId, fetchAllVideos, videoListItemSchema } from '@/lib/nocodb';
import type { FilterOption } from '@/lib/filterVideos';
import { filterVideos } from '@/lib/filterVideos';
import { notFound } from 'next/navigation';
import { VideoDetailPageContent } from './VideoDetailPageContent';

interface VideoDetailPageProps {
  params: { videoId: string };
  searchParams?: { 
    sort?: string | string[];
    [key: string]: string | string[] | undefined;
  };
}

export async function generateMetadata({ params }: VideoDetailPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const video = await fetchVideoByVideoId(resolvedParams.videoId);
  if (!video) {
    return {
      title: 'Video Not Found'
    };
  }
  return {
    title: `${video.Title} | Youtube Viewer`,
    description: video.TLDR || video.Description || `Details for video: ${video.Title}`
  };
}

export default async function VideoDetailPage({
  params: paramsProp,
  searchParams: searchParamsProp = { sort: '-CreatedAt' }
}: VideoDetailPageProps) {
  // Ensure both params and searchParams are resolved
  const [params, searchParams] = await Promise.all([
    Promise.resolve(paramsProp),
    Promise.resolve(searchParamsProp)
  ]);
  const { videoId } = params;

  // Fetch primary video data first to ensure an await before searchParams access
  const video = await fetchVideoByVideoId(videoId);

  // Check for video immediately after fetching. If not found, the rest of the component won't run.
  // This 'if' block was originally later, but it's fine here after 'video' is fetched.
  // The notFound() call itself will prevent further execution if video is null.
  if (!video) {
    notFound();
  }

  // Get sort parameter with type safety
  const sortParam = Array.isArray(searchParams.sort) 
    ? searchParams.sort[0] 
    : searchParams.sort;
  const currentSort = sortParam || '-CreatedAt';

  // Then fetch the list that depends on the sort order
  // Note: 'video' will be defined here due to the notFound() check above.
  const allVideoListItems = await fetchAllVideos({
    sort: currentSort,
    fields: [
      'Id',
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

  // Build selected filters from query params
  const filterValues = Array.isArray(searchParams.f)
    ? searchParams.f
    : searchParams.f
      ? [searchParams.f]
      : [];
  const selectedFilters: FilterOption[] = filterValues
    .map((p) => {
      const [type, ...rest] = p.split(':');
      const value = decodeURIComponent(rest.join(':'));
      if (!type || !value) return null;
      return { label: value, value, type } as FilterOption;
    })
    .filter(Boolean) as FilterOption[];

  const filteredList = filterVideos(
    Array.isArray(allVideoListItems) ? allVideoListItems : [],
    selectedFilters
  );

  
  
  
  const currentVideoIndexInList = filteredList.findIndex(item => item.VideoID === video.VideoID);

  let previousVideoData: { Id: string; Title: string | null } | null = null;
  let nextVideoData: { Id: string; Title: string | null } | null = null;

  if (currentVideoIndexInList !== -1) {
    const prevItem = currentVideoIndexInList > 0 ? filteredList[currentVideoIndexInList - 1] : null;
    const nextItem = currentVideoIndexInList < filteredList.length - 1 ? filteredList[currentVideoIndexInList + 1] : null;

    if (prevItem?.VideoID) {
      previousVideoData = { Id: prevItem.VideoID, Title: prevItem.Title || null };
    }
    if (nextItem?.VideoID) {
      nextVideoData = { Id: nextItem.VideoID, Title: nextItem.Title || null };
    }
  }

  return (
    <VideoDetailPageContent 
      video={video} 
      allVideos={filteredList}
      previousVideo={previousVideoData}
      nextVideo={nextVideoData}
    />
  );
}
