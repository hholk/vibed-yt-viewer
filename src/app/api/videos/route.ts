import { NextRequest, NextResponse } from 'next/server';
import { fetchVideos, videoListItemSchema } from "@/features/videos/api/nocodb";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const sort = searchParams.get('sort') || '-CreatedAt';

    console.log('🎯 API request received:', { page, limit, sort });

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

    console.log('📦 API result from NocoDB:', {
      videosCount: result.videos.length,
      pageInfo: result.pageInfo,
      hasNextPage: result.pageInfo.hasNextPage,
      totalRows: result.pageInfo.totalRows
    });

    if (result.videos.length === 0) {
      console.log('⚠️ No videos returned from NocoDB');
    }

    const response = {
      videos: result.videos,
      pageInfo: result.pageInfo,
      success: true,
      debug: {
        requestedPage: page,
        requestedLimit: limit,
        actualVideosReturned: result.videos.length
      }
    };

    console.log('📤 Sending response:', response.debug);
    return NextResponse.json(response);
  } catch (error) {
    console.error('💥 API error:', error);
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
