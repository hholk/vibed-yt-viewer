"use client";
import { useEffect, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import type { Video, VideoListItem } from "@/features/videos/api/nocodb";
import { VideoDetailPageContent } from "./VideoDetailPageContent";

interface VideoDetailPageClientProps {
  videoId: string;
  allVideos: VideoListItem[];
  initialVideo?: Video | null;
  initialPreviousVideo?: { Id: string; Title: string | null } | null;
  initialNextVideo?: { Id: string; Title: string | null } | null;
}

/**
 * Fetcher function that calls the API route
 * Service Worker will intercept this when offline and serve from IndexedDB
 */
const fetcher = async (videoId: string, sort: string = '-CreatedAt') => {
  const response = await fetch(`/api/videos/${videoId}/details?videoId=${videoId}&sort=${sort}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch video: ${response.status}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to load video');
  }

  return {
    video: data.video,
    previousVideo: data.previousVideo,
    nextVideo: data.nextVideo,
  };
};

export default function VideoDetailPageClient({
  videoId: serverVideoId,
  allVideos,
  initialVideo,
  initialPreviousVideo,
  initialNextVideo
}: VideoDetailPageClientProps) {
  // Extract videoId from browser URL to handle cached HTML pages correctly
  const [actualVideoId, setActualVideoId] = useState<string>(serverVideoId);

  useEffect(() => {
    // When offline, the Service Worker serves cached HTML with a stale videoId prop
    // We need to extract the actual videoId from the browser URL
    if (typeof window !== 'undefined') {
      const pathParts = window.location.pathname.split('/');
      const urlVideoId = pathParts[pathParts.length - 1];
      if (urlVideoId && urlVideoId !== actualVideoId) {
        console.log('[VideoDetailPageClient] Extracted videoId from URL:', urlVideoId, '(server prop was:', serverVideoId, ')');
        setActualVideoId(urlVideoId);
      }
    }
  }, [serverVideoId, actualVideoId]);

  const { data, error, isLoading } = useSWR(
    ["video-detail", actualVideoId],
    () => fetcher(actualVideoId),
    {
      fallbackData: initialVideo ? {
        video: initialVideo,
        previousVideo: initialPreviousVideo || null,
        nextVideo: initialNextVideo || null,
      } : undefined,
      revalidateOnFocus: false,
    }
  );

  if (isLoading && !data) {
    return (
      <div className="min-h-screen bg-neutral-900 text-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-xl text-neutral-400">Loading video details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-900 text-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-400 mb-4">Error: {error.message}</p>
          <Link href="/" className="text-blue-400 hover:text-blue-300 underline">
            Back to Video List
          </Link>
        </div>
      </div>
    );
  }

  if (!data?.video) {
    return (
      <div className="min-h-screen bg-neutral-900 text-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-neutral-400">Video not found.</p>
          <Link href="/" className="text-blue-400 hover:text-blue-300 underline">
            Back to Video List
          </Link>
        </div>
      </div>
    );
  }

  return (
    <VideoDetailPageContent
      video={data.video}
      allVideos={allVideos}
      previousVideo={data.previousVideo}
      nextVideo={data.nextVideo}
    />
  );
}
