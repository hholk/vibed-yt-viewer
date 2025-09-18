"use client";
import useSWR from "swr";
import { fetchVideoByVideoId, type Video, type VideoListItem } from "@/features/videos/api/nocodb";
import { VideoDetailPageContent } from "./VideoDetailPageContent";

interface VideoDetailPageClientProps {
  videoId: string;
  allVideos: VideoListItem[];
  initialVideo?: Video | null; 
}

const fetcher = (videoId: string) => fetchVideoByVideoId(videoId);

export default function VideoDetailPageClient({ videoId, allVideos, initialVideo }: VideoDetailPageClientProps) {
  
  const { data: video, error, isLoading } = useSWR(
    ["video-detail", videoId],
    () => fetcher(videoId),
    {
      fallbackData: initialVideo,
      revalidateOnFocus: false,
    }
  );

  if (isLoading && !video) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Failed to load video.</div>;
  if (!video) return <div className="p-8 text-center">Video not found.</div>;

  return <VideoDetailPageContent video={video} allVideos={allVideos} />;
}
