import { NextRequest, NextResponse } from 'next/server';
import { fetchVideoByVideoId, getVideoNavigationData, getSimpleNavigationData } from '@/features/videos/api/nocodb';

/**
 * GET /api/videos/[videoId]/details
 *
 * Fetches a single video with navigation data (previous/next videos).
 * This route is intercepted by the Service Worker when offline to serve from IndexedDB.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const { videoId } = resolvedParams;
    const { searchParams } = request.nextUrl;
    const sortParam = searchParams.get('sort') || '-CreatedAt';

    if (!videoId) {
      return NextResponse.json(
        {
          error: 'Missing videoId parameter',
          success: false,
        },
        { status: 400 }
      );
    }

    // Fetch the video
    const video = await fetchVideoByVideoId(videoId);

    if (!video) {
      return NextResponse.json(
        {
          error: 'Video not found',
          success: false,
        },
        { status: 404 }
      );
    }

    // Get navigation data (previous/next videos)
    let previousVideoData: { Id: string; Title: string | null } | null = null;
    let nextVideoData: { Id: string; Title: string | null } | null = null;

    try {
      const navData = await getVideoNavigationData(video.VideoID || '', sortParam);
      previousVideoData = navData.previousVideoData;
      nextVideoData = navData.nextVideoData;

      if (!previousVideoData && !nextVideoData) {
        const fallbackNavData = await getSimpleNavigationData(video.VideoID || '', sortParam);
        previousVideoData = fallbackNavData.previousVideoData;
        nextVideoData = fallbackNavData.nextVideoData;
      }
    } catch {
      // Continue without navigation data if there's an error
    }

    return NextResponse.json({
      success: true,
      video,
      previousVideo: previousVideoData,
      nextVideo: nextVideoData,
    });
  } catch (error) {
    console.error('Error fetching video details:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch video details',
        success: false,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
