'use client';

import dynamic from 'next/dynamic';
import type { Video, VideoListItem } from '@/lib/nocodb';

const Skeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    className={`animate-pulse bg-neutral-800 rounded-md ${className || ''}`}
    {...props}
  />
);

interface VideoDetailPageWrapperProps {
  video: Video;
  allVideos: VideoListItem[];
}

const VideoDetailPageContent = dynamic<VideoDetailPageWrapperProps>(
  () => import('./VideoDetailPageContent'),
  { 
    loading: () => (
      <div className="space-y-4 p-4">
        <Skeleton className="h-10 w-3/4" />
        <div className="flex space-x-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    ),
    ssr: false 
  }
);

export default function VideoDetailPageWrapper({ video, allVideos }: VideoDetailPageWrapperProps) {
  return <VideoDetailPageContent video={video} allVideos={allVideos} />;
}
