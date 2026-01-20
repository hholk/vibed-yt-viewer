'use client';

import Image from 'next/image';

import { DownloadControls } from '@/features/videos/components/download-controls';
import type { SavedVideo } from '../types';

interface SavedVideoCardProps {
  video: SavedVideo;
}

/**
 * Card UI for videos coming from the Saved playlist.
 */
export function SavedVideoCard({ video }: SavedVideoCardProps) {
  return (
    <div className="flex h-full flex-col rounded-lg shadow-sm transition-shadow hover:shadow-md">
      <a
        href={video.url}
        target="_blank"
        rel="noreferrer"
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
            {video.thumbnailUrl ? (
              <div className="relative w-full aspect-video">
                <Image
                  src={video.thumbnailUrl}
                  alt={`Thumbnail for ${video.title}`}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover object-top rounded-t-lg"
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
                title={video.title}
              >
                {video.title}
              </h3>
              {video.channel && (
                <p
                  className="text-xs truncate mb-0.5"
                  style={{ color: 'var(--video-card-meta)' }}
                  title={video.channel}
                >
                  {video.channel}
                </p>
              )}
              {video.duration && (
                <p
                  className="text-xs truncate mb-0.5"
                  style={{ color: 'var(--video-card-meta)' }}
                >
                  {video.duration}
                </p>
              )}
            </div>
          </div>
        </div>
      </a>
      <div className="bg-neutral-900 px-3 py-2 rounded-b-lg border-t border-neutral-800">
        <DownloadControls videoId={video.id} title={video.title} />
      </div>
    </div>
  );
}
