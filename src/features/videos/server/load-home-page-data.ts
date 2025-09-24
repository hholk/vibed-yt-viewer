import {
  fetchVideos,
  videoListItemSchema,
  type PageInfo,
  type VideoListItem,
} from '@/features/videos/api/nocodb';

export interface HomePageData {
  videos: VideoListItem[];
  pageInfo: PageInfo | null;
  sort: string;
  error: string | null;
}

function resolveSortParam(rawSort: string | string[] | undefined): string {
  if (Array.isArray(rawSort)) {
    return rawSort[0] ?? '-CreatedAt';
  }

  return typeof rawSort === 'string' && rawSort.length > 0 ? rawSort : '-CreatedAt';
}

/**
 * Fetches the initial list of videos for the home page. The app only needs the
 * first page during the initial render because infinite scrolling loads the rest
 * on demand. Keeping the logic isolated makes testing easier and keeps the page
 * component lean for beginners.
 */
export async function loadHomePageData(
  searchParams: Record<string, string | string[] | undefined>,
): Promise<HomePageData> {
  const sort = resolveSortParam(searchParams.sort);

  try {
    const { videos, pageInfo } = await fetchVideos({
      sort,
      limit: 35,
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

    return {
      videos,
      pageInfo,
      sort,
      error: null,
    };
  } catch (error) {
    return {
      videos: [],
      pageInfo: null,
      sort,
      error: error instanceof Error ? error.message : 'An unknown error occurred while fetching videos.',
    };
  }
}
