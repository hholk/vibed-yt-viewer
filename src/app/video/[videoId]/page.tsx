import type { Metadata } from 'next';
import VideoDetailPageClient from './VideoDetailPageClient';

interface VideoDetailPageProps {
  params: { videoId: string };
  searchParams?: {
    sort?: string | string[];
    [key: string]: string | string[] | undefined;
  };
}

/**
 * Static metadata for video detail pages
 * Keep generic to allow offline functionality
 */
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Video Details | Youtube Viewer`,
    description: 'View video details and summaries'
  };
}

/**
 * Video Detail Page - Client-Side Rendering
 *
 * This page is fully client-side to enable offline functionality.
 * The VideoDetailPageClient component fetches data via /api/videos/[videoId]/details,
 * which the Service Worker intercepts when offline to serve from IndexedDB.
 */
export default async function VideoDetailPage({
  params: paramsProp,
}: VideoDetailPageProps) {
  const params = await Promise.resolve(paramsProp);
  const { videoId } = params;

  return (
    <VideoDetailPageClient
      videoId={videoId}
      allVideos={[]}
    />
  );
}
