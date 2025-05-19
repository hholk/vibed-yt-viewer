import { fetchAllVideos, type VideoListItem, videoListItemSchema } from "@/lib/nocodb";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { SortDropdown } from '@/components/sort-dropdown';
import { VideoCard } from '@/components/video-card';

export default async function HomePage({ searchParams: searchParamsPromise }: { searchParams: Promise<{ sort?: string; [key: string]: string | string[] | undefined }> }) {
  let videos: VideoListItem[] = [];
  let error: string | null = null;

  try {
    const resolvedSearchParams = await searchParamsPromise;
    const sortParam = resolvedSearchParams.sort;
    const currentSort = typeof sortParam === 'string' ? sortParam : '-CreatedAt'; // Default sort
    // Fetch all videos but only specific fields for the list view
    const fetchedVideosData = await fetchAllVideos({
      sort: currentSort,
      fields: ['Id', 'Title', 'ThumbHigh', 'Channel', 'VideoID'], // Ensure 'Id' & 'VideoID' are fetched
      schema: videoListItemSchema,
    });
    videos = fetchedVideosData;
    // pageInfo could be used here if pagination controls were added to the main page
  } catch (e: unknown) {
    console.error('Failed to fetch videos:', e);
    error = e instanceof Error ? e.message : 'An unknown error occurred while fetching videos.';
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error Fetching Videos</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!videos || videos.length === 0) {
    return (
      <div className="container mx-auto p-4">
        <Alert>
          <Terminal className="h-4 w-4" />
          <AlertTitle>No Videos Found</AlertTitle>
          <AlertDescription>
            There are currently no videos to display. Check back later or add some via NocoDB.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-brand font-mono">Video Collection</h1>
        <SortDropdown />
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
        {videos.map((video, index) => (
          <VideoCard 
            key={video.Id} 
            video={video} 
            priority={index === 0} // Only set priority for the first image to improve LCP
          />
        ))}
      </div>
    </div>
  );
}
