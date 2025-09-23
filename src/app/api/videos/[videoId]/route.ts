import { NextRequest, NextResponse } from 'next/server';
import { updateVideoSimple, deleteVideo } from "@/features/videos/api/nocodb";

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId, data } = body;

    if (!videoId || !data) {
      return NextResponse.json(
        {
          error: 'Missing required fields: videoId and data',
          success: false
        },
        { status: 400 }
      );
    }

    const updatedVideo = await updateVideoSimple(videoId, data);

    return NextResponse.json({
      success: true,
      video: updatedVideo
    });
  } catch (error) {
    console.error('Video update error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update video',
        success: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
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
    console.error('Video delete error:', error);
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
