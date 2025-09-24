import { NextRequest, NextResponse } from 'next/server';
import { updateVideo, deleteVideo } from '@/features/videos/api/nocodb';

/**
 * API handlers in Next.js are simple async functions. We keep the logic tiny here
 * and delegate the heavy lifting to the NocoDB service layer so beginners can
 * trace the flow easily: validate input → call the service → return JSON.
 */

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId, data } = body;

    if (!videoId || !data) {
      return NextResponse.json(
        {
          error: 'Missing required fields: videoId and data',
          success: false,
        },
        { status: 400 },
      );
    }

    const updatedVideo = await updateVideo(videoId, data);

    return NextResponse.json({
      success: true,
      video: updatedVideo,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to update video',
        success: false,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json(
        {
          error: 'Missing required field: videoId',
          success: false
        },
        { status: 400 }
      );
    }

    await deleteVideo(videoId);

    return NextResponse.json({
      success: true,
      message: 'Video deleted successfully'
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to delete video',
        success: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
