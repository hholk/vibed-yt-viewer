import type { Metadata } from 'next';
import { fetchVideoByVideoId, fetchAllVideos } from '@/lib/nocodb';
import { notFound } from 'next/navigation';
import { VideoDetailPageContent } from './VideoDetailPageContent';

interface VideoDetailPageProps {
  params: { videoId: string };
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

export default async function VideoDetailPage({ params }: VideoDetailPageProps) {
  const { videoId } = await params;
  const [video, allVideos] = await Promise.all([
    fetchVideoByVideoId(videoId),
    fetchAllVideos()
  ]);

  if (!video) {
    notFound();
  }

  // Ensure allVideos is an array and contains the current video
  const validVideos = Array.isArray(allVideos) ? allVideos : [];
  const currentVideoIndex = validVideos.findIndex(v => v.VideoID === video.VideoID);
  
  // If current video is not in the list, add it to ensure navigation works
  const videosWithCurrent = currentVideoIndex === -1 
    ? [video, ...validVideos] 
    : validVideos;

  return <VideoDetailPageContent video={video} allVideos={videosWithCurrent} />;
}
