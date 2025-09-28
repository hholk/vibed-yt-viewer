import { Skeleton } from '@/shared/components/ui/skeleton';

export function VideoCardSkeleton() {
  return (
    <div className="w-full flex flex-col h-full rounded-lg shadow-sm">
      <div className="p-0 rounded-t-lg overflow-hidden">
        <Skeleton className="relative w-full aspect-video" />
      </div>
      <div className="p-2 flex-grow flex flex-col justify-between bg-neutral-800/50 rounded-b-lg">
        <div>
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </div>
  );
}
