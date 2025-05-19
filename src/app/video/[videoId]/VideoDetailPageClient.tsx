"use client";
import useSWR from "swr";
import { fetchVideoByVideoId, type Video, type VideoListItem } from "@/lib/nocodb";
import { VideoDetailPageContent } from "./VideoDetailPageContent";

interface VideoDetailPageClientProps {
  videoId: string;
  allVideos: VideoListItem[];
  initialVideo?: Video | null; // for hydration, optional
}

// SWR fetcher for video detail
const fetcher = (videoId: string) => fetchVideoByVideoId(videoId);

/**
 * Client component that uses SWR to fetch and cache video detail data.
 * This enables robust caching and preloading for video details.
 */
export default function VideoDetailPageClient({ videoId, allVideos, initialVideo }: VideoDetailPageClientProps) {
  // Use SWR for caching and revalidation
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
