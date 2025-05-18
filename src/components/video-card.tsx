import Link from 'next/link';
import Image from 'next/image';
// Star import and renderStars function are no longer needed for VideoListItem display
// import { Star } from 'lucide-react'; 
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { VideoListItem } from '@/lib/nocodb'; // Updated import

interface VideoCardProps {
  video: VideoListItem; // Updated prop type
  priority?: boolean; // Add priority prop for LCP optimization
}

// const MAX_RATING = 5; // No longer needed

// const renderStars = (rating: number | null | undefined) => { // No longer needed
//   if (rating === null || rating === undefined || rating === 0) return null;
//   return (
//     <div className="flex items-center mt-1 mb-2" data-testid="star-rating-display">
//       {[...Array(MAX_RATING)].map((_, i) => (
//         <Star
//           key={i}
//           className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
//         />
//       ))}
//     </div>
//   );
// };

export function VideoCard({ video, priority = false }: VideoCardProps) {
  // Ensure ThumbHigh is a valid URL string or null
  const thumbnailUrl = video.ThumbHigh && typeof video.ThumbHigh === 'string' ? video.ThumbHigh : null;

  return (
    // Link now uses video.VideoID which is present in VideoListItem
    <Link href={`/video/${video.VideoID}`} passHref className="block hover:shadow-lg transition-shadow duration-200 rounded-lg h-full">
      <Card className="w-full flex flex-col h-full bg-card text-card-foreground p-0">
        <CardHeader className="p-0 rounded-t-lg overflow-hidden">
          {thumbnailUrl ? (
            <div className="relative w-full aspect-video">
              <Image
                src={thumbnailUrl}
                alt={`Thumbnail for ${video.Title}`}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover object-top rounded-t-lg"
                priority={priority}
              />
            </div>
          ) : (
            <div className="relative w-full aspect-video bg-muted flex items-center justify-center rounded-t-lg">
              <span className="text-sm text-muted-foreground">No Thumbnail</span>
            </div>
          )}
        </CardHeader>
        {/* Reduced padding from p-3 to p-2 for CardContent to decrease height */}
        <CardContent className="p-2 flex-grow flex flex-col justify-between -mt-px">
          <div>
            {/* Title font size can be kept, line-clamp helps control height */}
            <CardTitle className="text-base font-semibold line-clamp-2 mb-0.5" title={video.Title}>
              {video.Title}
            </CardTitle>
            {video.Channel && (
              // Channel text, kept small, mb-0.5 to reduce space if no stars/comments follow
              <p className="text-xs text-muted-foreground truncate mb-0.5" title={video.Channel}>
                {video.Channel}
              </p>
            )}
            {/* ImportanceRating and renderStars are removed as per VideoListItem */} 
            {/* {renderStars(video.ImportanceRating)} */} 
          </div>
          {/* PersonalComment and commentSnippet are removed */}
          {/* {commentSnippet && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2" title={video.PersonalComment || ''} data-testid="personal-comment-snippet">
              {commentSnippet}
            </p>
          )} */}
        </CardContent>
        {/* No interactive footer needed for now */}
      </Card>
    </Link>
  );
}
