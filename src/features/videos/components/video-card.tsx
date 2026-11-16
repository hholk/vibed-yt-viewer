'use client';

import Image from 'next/image';
import Link from 'next/link';

import { DownloadControls } from './download-controls';
import type { VideoListItem } from '@/features/videos/api/nocodb';

interface VideoCardProps {
  video: VideoListItem;
  priority?: boolean;
  href?: string;
}

export function VideoCard({ video, href, priority = false }: VideoCardProps) {
  const thumbnailUrl =
    video.ThumbHigh && typeof video.ThumbHigh === 'string' ? video.ThumbHigh : null;

  return (
    <div className="flex h-full flex-col rounded-lg shadow-sm transition-shadow hover:shadow-md">
      <Link
        href={href ?? `/video/${video.VideoID}`}
        className="block h-full rounded-lg hover:shadow-lg transition-shadow duration-200"
      >
        <div
          className="w-full flex flex-col h-full rounded-lg"
          style={{
            backgroundColor: 'var(--video-card-bg)',
            color: 'var(--video-card-text)',
          }}
        >
          <div className="p-0 rounded-t-lg overflow-hidden">
            {thumbnailUrl ? (
              <div className="relative w-full aspect-video">
                <Image
                  src={thumbnailUrl}
                  alt={`Thumbnail for ${video.Title}`}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover object-top rounded-t-lg"
                  priority={priority}
                />
              </div>
            ) : (
              <div
                className="relative w-full aspect-video flex items-center justify-center rounded-t-lg"
                style={{ backgroundColor: 'var(--video-card-placeholder)' }}
              >
                <span style={{ color: 'var(--video-card-meta)' }}>No Thumbnail</span>
              </div>
            )}
          </div>
          <div className="p-2 flex-grow flex flex-col justify-between bg-neutral-800/50 rounded-b-lg">
            <div>
              <h3
                className="text-base font-semibold line-clamp-2 mb-0.5"
                style={{ color: 'var(--video-card-title)' }}
                title={video.Title ?? undefined}
              >
                {video.Title}
              </h3>
              {video.Channel && (
                <p
                  className="text-xs truncate mb-0.5"
                  style={{ color: 'var(--video-card-meta)' }}
                  title={video.Channel}
                >
                  {video.Channel}
                </p>
              )}
            </div>
          </div>
        </div>
      </Link>
      <div className="bg-neutral-900 px-3 py-2 rounded-b-lg border-t border-neutral-800">
        <DownloadControls videoId={video.VideoID} title={video.Title} />
      </div>
    </div>
  );
}
