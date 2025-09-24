import { NextRequest, NextResponse } from 'next/server';
import { fetchVideos, videoListItemSchema } from '@/features/videos/api/nocodb';

/**
 * This route acts as a tiny proxy between the client and the data layer. It keeps
 * query parsing in one place and relies on the shared fetcher so the same
 * validation rules apply in API routes and server components alike.
 */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '35');
    const sort = searchParams.get('sort') || '-CreatedAt';

    // Fetch the requested page of videos
    const result = await fetchVideos({
      sort,
      limit,
      page,
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

    const response = {
      videos: result.videos,
      pageInfo: {
        ...result.pageInfo,
        hasNextPage: !result.pageInfo.isLastPage,
      },
      success: true,
    };
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch videos',
        success: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
