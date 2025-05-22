'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { VideoListItem } from '@/lib/nocodb'; 

interface VideoCardProps {
  video: VideoListItem; 
  priority?: boolean; 
}

export function VideoCard({ video, priority = false }: VideoCardProps) {
  const searchParams = useSearchParams();
  
  const thumbnailUrl = video.ThumbHigh && typeof video.ThumbHigh === 'string' ? video.ThumbHigh : null;

  return (
    
    <Link href={`/video/${video.VideoID}${searchParams ? `?${searchParams.toString()}` : ''}`} passHref className="block hover:shadow-lg transition-shadow duration-200 rounded-lg h-full">
      <Card className="w-full flex flex-col h-full bg-card text-card-foreground p-0">
        <CardHeader className="p-0 rounded-t-lg overflow-hidden">
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
            <div className="relative w-full aspect-video bg-muted flex items-center justify-center rounded-t-lg">
              <span className="text-sm text-muted-foreground">No Thumbnail</span>
            </div>
          )}
        </CardHeader>
        {}
        <CardContent className="p-2 flex-grow flex flex-col justify-between -mt-px">
          <div>
            {}
            <CardTitle className="text-base font-semibold line-clamp-2 mb-0.5" title={video.Title}>
              {video.Title}
            </CardTitle>
            {video.Channel && (
              
              <p className="text-xs text-muted-foreground truncate mb-0.5" title={video.Channel}>
                {video.Channel}
              </p>
            )}
            {} 
            {} 
          </div>
          {}
          {}
        </CardContent>
        {}
      </Card>
    </Link>
  );
}
