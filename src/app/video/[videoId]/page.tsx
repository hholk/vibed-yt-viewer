import type { Metadata } from 'next';
import { fetchVideoByVideoId, fetchAllVideos } from '@/lib/nocodb';
import { notFound } from 'next/navigation';
import { VideoDetailPageContent } from './VideoDetailPageContent';

interface VideoDetailPageProps {
  params: { videoId: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}

export async function generateMetadata({ params }: VideoDetailPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const video = await fetchVideoByVideoId(resolvedParams.videoId);
  if (!video) {
    return {
      title: 'Video Not Found'
    };
  }
  return {
    title: `${video.Title} | Youtube Viewer`,
    description: video.TLDR || video.Description || `Details for video: ${video.Title}`
  };
}

export default async function VideoDetailPage({ params, searchParams }: VideoDetailPageProps) {
  const { videoId } = await params;
  const sortParam = searchParams?.sort;
  const currentSort = typeof sortParam === 'string' ? sortParam : '-CreatedAt'; 

  
  const [video, allVideoListItems] = await Promise.all([
    fetchVideoByVideoId(videoId),
    fetchAllVideos({
      sort: currentSort,
      fields: ['Id', 'VideoID', 'Title'], 
      
    }),
  ]);

  if (!video) {
    notFound();
  }

  
  const validVideoListItems = Array.isArray(allVideoListItems) ? allVideoListItems : [];

  
  
  
  const currentVideoIndexInList = validVideoListItems.findIndex(item => item.VideoID === video.VideoID);

  let previousVideoData: { Id: string; Title: string | null } | null = null;
  let nextVideoData: { Id: string; Title: string | null } | null = null;

  if (currentVideoIndexInList !== -1) {
    const prevItem = currentVideoIndexInList > 0 ? validVideoListItems[currentVideoIndexInList - 1] : null;
    const nextItem = currentVideoIndexInList < validVideoListItems.length - 1 ? validVideoListItems[currentVideoIndexInList + 1] : null;

    if (prevItem?.VideoID) {
      previousVideoData = { Id: prevItem.VideoID, Title: prevItem.Title || null };
      
      fetchVideoByVideoId(prevItem.VideoID); 
    }
    if (nextItem?.VideoID) {
      nextVideoData = { Id: nextItem.VideoID, Title: nextItem.Title || null };
      
      fetchVideoByVideoId(nextItem.VideoID);
    }
  }

  return (
    <VideoDetailPageContent 
      video={video} 
      allVideos={validVideoListItems} 
      previousVideo={previousVideoData}
      nextVideo={nextVideoData}
    />
  );
}
