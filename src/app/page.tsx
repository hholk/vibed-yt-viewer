import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert';
import { Terminal } from 'lucide-react';
import { SearchComponent } from '@/shared/components/search-component';
import { loadHomePageData } from '@/features/videos/server/load-home-page-data';

type HomePageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function HomePage({ searchParams = {} }: HomePageProps) {
  // Resolving the params first keeps the function friendly to both sync and async callers.
  const resolvedParams = await Promise.resolve(searchParams);
  const { videos, pageInfo, error } = await loadHomePageData(resolvedParams);

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-900 text-neutral-50 p-4 md:p-8 font-plex-sans">
        <div className="container mx-auto max-w-5xl">
          <div className="mb-6 flex flex-wrap justify-between items-center gap-4">
            <h1 className="text-3xl font-semibold text-neutral-100">Video Collection</h1>
          </div>
          <Alert variant="destructive" className="bg-red-900/30 border-red-600 text-red-300">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Error Fetching Videos</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-900 text-neutral-50 p-4 md:p-8 font-plex-sans">
        <div className="container mx-auto max-w-5xl">
          <div className="mb-6 flex flex-wrap justify-between items-center gap-4">
            <h1 className="text-3xl font-semibold text-neutral-100">Video Collection</h1>
          </div>
          <Alert className="bg-neutral-800/50 border-neutral-600 text-neutral-300 p-4 rounded-lg">
            <Terminal className="h-4 w-4" />
            <AlertTitle>No Videos Found</AlertTitle>
            <AlertDescription>
              There are currently no videos to display. Check back later or add some via NocoDB.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-50 p-4 md:p-8 font-plex-sans">
      <div className="container mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap justify-between items-center gap-4">
          <h1 className="text-3xl font-semibold text-neutral-100 break-words hyphens-auto" title="Video Collection">
            Video Collection
          </h1>
          <div className="text-sm text-neutral-400">{pageInfo?.totalRows || 0} total videos</div>
        </div>

        <div className="search-component-wrapper">
          <SearchComponent initialVideos={videos} />
        </div>
      </div>
    </div>
  );
}
