import { NextRequest, NextResponse } from 'next/server';
import { fetchVideos, videoListItemSchema } from '@/features/videos/api/nocodb';
import { VIDEO_LIST_FIELDS } from '@/features/videos/api/fields';
import { normalizePagination } from '@/shared/utils/pagination';

/**
 * This route acts as a tiny proxy between the client and the data layer. It keeps
 * query parsing in one place and relies on the shared fetcher so the same
 * validation rules apply in API routes and server components alike.
 */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const rawPage = searchParams.get('page');
    const rawLimit = searchParams.get('limit');
    const sort = searchParams.get('sort') || '-CreatedAt';

    const { page, limit } = normalizePagination({
      page: rawPage ? parseInt(rawPage) : undefined,
      limit: rawLimit ? parseInt(rawLimit) : undefined,
    });

    const result = await fetchVideos({
      sort,
      limit,
      page,
      fields: [...VIDEO_LIST_FIELDS],
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
