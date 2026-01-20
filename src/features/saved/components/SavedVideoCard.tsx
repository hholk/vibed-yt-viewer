import Image from 'next/image';

import type { SavedPlaylistItem } from '../types';

type SavedVideoCardProps = {
  item: SavedPlaylistItem;
};

export function SavedVideoCard({ item }: SavedVideoCardProps) {
  const videoUrl = item.videoId ? `https://www.youtube.com/watch?v=${item.videoId}` : '#';

  return (
    <div className="w-full flex flex-col h-full rounded-lg shadow-sm bg-neutral-800/50">
      <div className="p-0 rounded-t-lg overflow-hidden">
        {item.thumbnailUrl ? (
          <div className="relative w-full aspect-video">
            <Image
              src={item.thumbnailUrl}
              alt={`Thumbnail for ${item.title}`}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover object-top rounded-t-lg"
            />
          </div>
        ) : (
          <div className="relative w-full aspect-video flex items-center justify-center rounded-t-lg bg-neutral-700/70">
            <span className="text-xs text-neutral-300">No Thumbnail</span>
          </div>
        )}
      </div>
      <div className="p-2 flex-grow flex flex-col justify-between rounded-b-lg">
        <div>
          <h3 className="text-base font-semibold line-clamp-2 mb-0.5 text-neutral-100" title={item.title}>
            {item.title}
          </h3>
          <p className="text-xs truncate mb-0.5 text-neutral-400" title={item.channelTitle}>
            {item.channelTitle}
          </p>
        </div>
        <div className="mt-2 flex justify-end">
          {/* Link to the actual YouTube video so users can download via their preferred method */}
          <a
            href={videoUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-neutral-300 hover:text-neutral-50 underline underline-offset-4"
          >
            Open on YouTube
          </a>
        </div>
      </div>
    </div>
  );
}
