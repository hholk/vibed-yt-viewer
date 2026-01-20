import { NextResponse } from 'next/server';

import { fetchVideoByVideoId } from '@/features/videos/api/nocodb';

// This endpoint returns a single video as a downloadable JSON file so beginners can
// see the exact data that is stored in NocoDB.
export async function GET(
  _request: Request,
  { params }: { params: { videoId: string } },
) {
  const video = await fetchVideoByVideoId(params.videoId);

  if (!video) {
    return NextResponse.json(
      {
        success: false,
        error: 'Video not found',
      },
      { status: 404 },
    );
  }

  const body = JSON.stringify(video, null, 2);

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="video-${params.videoId}.json"`,
    },
  });
}
