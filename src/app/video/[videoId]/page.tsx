import type { Metadata } from 'next';
import { fetchVideoByVideoId, fetchAllVideos } from '@/lib/nocodb';
import { notFound } from 'next/navigation';
import { VideoDetailPageContent } from './VideoDetailPageContent';

interface VideoDetailPageProps {
  params: { videoId: string };
  searchParams?: { 
    sort?: string | string[];
    [key: string]: string | string[] | undefined;
  };
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

export default async function VideoDetailPage({ 
  params: paramsProp, 
  searchParams: searchParamsProp = { sort: '-CreatedAt' } 
}: VideoDetailPageProps) {
  // Ensure both params and searchParams are resolved
  const [params, searchParams] = await Promise.all([
    Promise.resolve(paramsProp),
    Promise.resolve(searchParamsProp)
  ]);
  const { videoId } = params;

  // Fetch primary video data first to ensure an await before searchParams access
  const video = await fetchVideoByVideoId(videoId);

  // Check for video immediately after fetching. If not found, the rest of the component won't run.
  // This 'if' block was originally later, but it's fine here after 'video' is fetched.
  // The notFound() call itself will prevent further execution if video is null.
  if (!video) {
    notFound();
  }

  // Get sort parameter with type safety
  const sortParam = Array.isArray(searchParams.sort) 
    ? searchParams.sort[0] 
    : searchParams.sort;
  const currentSort = sortParam || '-CreatedAt';

  // Then fetch the list that depends on the sort order
  // Note: 'video' will be defined here due to the notFound() check above.
  const allVideoListItems = await fetchAllVideos({
    sort: currentSort,
    fields: ['Id', 'VideoID', 'Title'], // Kept fields consistent with original
  });

  // The if (!video) check was here, but it's now redundant as it's performed earlier.
  
  const validVideoListItems = Array.isArray(allVideoListItems) ? allVideoListItems : [];

  
  

  return (
    <VideoDetailPageContent video={video} allVideos={validVideoListItems} />
  );
}
