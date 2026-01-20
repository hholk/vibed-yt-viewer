import { Readable } from 'node:stream';

import { NextRequest, NextResponse } from 'next/server';
import ytdl, { type videoFormat } from 'ytdl-core';

import {
  DEFAULT_AUDIO_QUALITY,
  DEFAULT_VIDEO_QUALITY,
  selectAudioFormat,
  selectVideoFormat,
} from '@/features/videos/utils/download-format';

const buildVideoUrl = (videoId: string) => `https://www.youtube.com/watch?v=${videoId}`;

const getAttachmentFilename = (options: {
  videoId: string;
  type: 'video' | 'audio';
  quality: string;
  container?: string | null;
}) => {
  const safeQuality = options.quality.replace(/[^a-z0-9]/gi, '_');
  const extension = options.container ?? (options.type === 'audio' ? 'mp3' : 'mp4');
  return `youtube-${options.videoId}-${options.type}-${safeQuality}.${extension}`;
};

/**
 * Stream a YouTube video or audio file to the client.
 * Uses ytdl-core to pick the best matching format and then streams it directly.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { videoId: string } },
) {
  const { videoId } = params;

  if (!ytdl.validateID(videoId)) {
    return NextResponse.json(
      { success: false, error: 'Invalid video ID.' },
      { status: 400 },
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const type = (searchParams.get('type') ?? 'video') as 'video' | 'audio';
  const quality =
    searchParams.get('quality') ??
    (type === 'audio' ? DEFAULT_AUDIO_QUALITY : DEFAULT_VIDEO_QUALITY);

  try {
    const info = await ytdl.getInfo(buildVideoUrl(videoId));
    const formats = info.formats;

    let selectedFormat: videoFormat | undefined;

    if (type === 'audio') {
      const audioFormats = ytdl.filterFormats(formats, 'audioonly');
      selectedFormat = selectAudioFormat(audioFormats, quality);
    } else {
      const videoFormats = ytdl.filterFormats(formats, 'videoandaudio');
      selectedFormat = selectVideoFormat(videoFormats, quality);
    }

    if (!selectedFormat) {
      return NextResponse.json(
        { success: false, error: 'No matching format found.' },
        { status: 404 },
      );
    }

    const mimeType = selectedFormat.mimeType?.split(';')[0] ?? 'application/octet-stream';
    const filename = getAttachmentFilename({
      videoId,
      type,
      quality,
      container: selectedFormat.container,
    });
    const downloadStream = ytdl.downloadFromInfo(info, {
      format: selectedFormat,
    });
    const webStream = Readable.toWeb(downloadStream) as ReadableStream<Uint8Array>;

    return new NextResponse(webStream, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to start download.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
