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
  const currentSort = typeof sortParam === 'string' ? sortParam : '-CreatedAt'; // Default sort from app/page.tsx

  // Fetch current video and the sorted list of all videos (minimal data for list)
  const [video, allVideoListItems] = await Promise.all([
    fetchVideoByVideoId(videoId),
    fetchAllVideos({
      sort: currentSort,
      fields: ['Id', 'VideoID', 'Title'], // Ensure fields for nav are present
      // No specific schema needed here, as default will be fine, or rely on fetchAllVideos default
    }),
  ]);

  if (!video) {
    notFound();
  }

  // Ensure allVideoListItems is an array
  const validVideoListItems = Array.isArray(allVideoListItems) ? allVideoListItems : [];

  // Find the current video's index in the sorted list
  // Note: video is full Video object, allVideoListItems contains VideoListItems
  // We need to match based on VideoID, as 'Id' might differ if schemas are misaligned or current video not in list initially
  const currentVideoIndexInList = validVideoListItems.findIndex(item => item.VideoID === video.VideoID);

  let previousVideoData: { Id: string; Title: string | null } | null = null;
  let nextVideoData: { Id: string; Title: string | null } | null = null;

  if (currentVideoIndexInList !== -1) {
    const prevItem = currentVideoIndexInList > 0 ? validVideoListItems[currentVideoIndexInList - 1] : null;
    const nextItem = currentVideoIndexInList < validVideoListItems.length - 1 ? validVideoListItems[currentVideoIndexInList + 1] : null;

    if (prevItem?.VideoID) {
      previousVideoData = { Id: prevItem.VideoID, Title: prevItem.Title || null };
      // Server-side pre-fetch (fire and forget - populates Next.js data cache if fetchVideoByVideoId uses fetch internally, or our videoCache)
      fetchVideoByVideoId(prevItem.VideoID); 
    }
    if (nextItem?.VideoID) {
      nextVideoData = { Id: nextItem.VideoID, Title: nextItem.Title || null };
      // Server-side pre-fetch
      fetchVideoByVideoId(nextItem.VideoID);
    }
  }

  return (
    <VideoDetailPageContent 
      video={video} 
      allVideos={validVideoListItems} // Pass the list items for potential other uses or future refactoring
      previousVideo={previousVideoData}
      nextVideo={nextVideoData}
    />
  );
}
