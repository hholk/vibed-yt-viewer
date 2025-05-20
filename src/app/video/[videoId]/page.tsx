import type { Metadata } from 'next';
import { fetchVideoByVideoId, fetchAllVideos } from '@/lib/nocodb';
import { notFound } from 'next/navigation';
import VideoDetailPageContent from './VideoDetailPageContent';

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
  const { videoId } = params; // Corrected: No await for params

  // Fetch primary video data first to ensure an await before searchParams access
  const video = await fetchVideoByVideoId(videoId);

  // Check for video immediately after fetching. If not found, the rest of the component won't run.
  // This 'if' block was originally later, but it's fine here after 'video' is fetched.
  // The notFound() call itself will prevent further execution if video is null.
  if (!video) {
    notFound();
  }

  // Now that an await has occurred (for fetchVideoByVideoId), we can safely access searchParams
  const sortParam = searchParams?.sort;
  const currentSort = typeof sortParam === 'string' ? sortParam : '-CreatedAt';

  // Then fetch the list that depends on the sort order
  // Note: 'video' will be defined here due to the notFound() check above.
  const allVideoListItems = await fetchAllVideos({
    sort: currentSort,
    fields: ['Id', 'VideoID', 'Title'], // Kept fields consistent with original
  });

  // The if (!video) check was here, but it's now redundant as it's performed earlier.
  
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
