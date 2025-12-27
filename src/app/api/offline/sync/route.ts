import { NextResponse } from 'next/server';
import { fetchVideos, videoOfflineCacheItemSchema } from '@/features/videos/api/nocodb';
import { updateVideo, deleteVideo } from '@/features/videos/api/mutations';

// Increase timeout for slow Cloudflare tunnels (2 minutes)
export const maxDuration = 120;

/**
 * Server-side sync endpoint
 *
 * For 'cache': Returns newest videos from NocoDB (client stores in IndexedDB)
 * For 'mutations': Executes pending mutations from client
 */
export async function POST(request: Request) {
  const startTime = Date.now();
  console.log('[API /api/offline/sync] Received sync request');

  try {
    const body = await request.json();
    const { action, mutations } = body;
    console.log(`[API /api/offline/sync] Action: ${action}`);

    if (action === 'cache') {
      // Fetch newest videos from NocoDB (without transcripts)
      console.log('[API /api/offline/sync] Fetching newest videos from NocoDB...');

      try {
        // CRITICAL: Clear cache before fetching to avoid stale empty results
        const { clearAllCache } = await import('@/features/videos/api/cache');
        clearAllCache();
        console.log('[API /api/offline/sync] Cleared video cache');

        // Use CreatedAt sorting (proven to work) and request the fields needed for offline detail pages.
        console.log('[API /api/offline/sync] Calling fetchVideos with offline-cache params...');
        const result = await fetchVideos({
          sort: '-CreatedAt',
          limit: 2000,
          page: 1,
          fields: [
            'Id',
            'rowId',
            'Title',
            'ThumbHigh',
            'URL',
            'Channel',
            'Description',
            'VideoGenre',
            'VideoID',
            'CreatedAt',
            'UpdatedAt',
            'PublishedAt',
            'Persons',
            'Companies',
            'Indicators',
            'Trends',
            'InvestableAssets',
            'TickerSymbol',
            'Institutions',
            'EventsFairs',
            'DOIs',
            'Hashtags',
            'MainTopic',
            'PrimarySources',
            'Sentiment',
            'SentimentReason',
            'TechnicalTerms',
            'Speaker',
            // Detail view essentials (without transcripts)
            'ImportanceRating',
            'PersonalComment',
            'Watched',
            'Notes',
            'Tags',
            'Categories',
            'CompletionDate',
            'ActionableAdvice',
            'TLDR',
            'MainSummary',
            'DetailedNarrativeFlow',
            'MemorableQuotes',
            'MemorableTakeaways',
            'KeyExamples',
            'BookMediaRecommendations',
            'RelatedURLs',
            // Extra context used across UI/search
            'TopicsDiscussed',
            'Speakers',
            'Subtitles',
            'Duration',
            'Language',
            'Priority',
            'Status',
          ],
          schema: videoOfflineCacheItemSchema,
        });

        console.log(`[API /api/offline/sync] fetchVideos returned ${result.videos.length} videos (total: ${result.pageInfo.totalRows})`);

        if (result.videos.length === 0) {
          console.warn('[API /api/offline/sync] WARNING: No videos returned from NocoDB!');
        }

        // Videos already exclude transcripts via fields parameter
        const videos = result.videos;

        console.log(`[API /api/offline/sync] Returning ${videos.length} videos in ${Date.now() - startTime}ms`);

        return NextResponse.json({
          videos,
          timestamp: Date.now(),
          totalAvailable: result.pageInfo.totalRows,
        });
      } catch (fetchError) {
        console.error('[API /api/offline/sync] Failed to fetch videos from NocoDB:', fetchError);
        throw new Error(`Failed to fetch videos from NocoDB: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
      }

    } else if (action === 'mutations') {
      // Execute pending mutations on server
      console.log('[API /api/offline/sync] Processing mutations...', mutations?.length || 0);

      if (!mutations || !Array.isArray(mutations)) {
        return NextResponse.json({ synced: 0, errors: [] });
      }

      const errors: Array<{ mutationId: string; error: string }> = [];
      let synced = 0;

      for (const mutation of mutations) {
        try {
          if (mutation.type === 'UPDATE') {
            await updateVideo(mutation.videoId, mutation.data);
          } else if (mutation.type === 'DELETE') {
            await deleteVideo(mutation.videoId);
          }
          synced++;
        } catch (error) {
          console.error(`[API /api/offline/sync] Failed to sync mutation:`, error);
          errors.push({
            mutationId: mutation.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      console.log(`[API /api/offline/sync] Synced ${synced}/${mutations.length} mutations in ${Date.now() - startTime}ms`);

      return NextResponse.json({ synced, errors });

    } else {
      console.error(`[API /api/offline/sync] Invalid action: ${action}`);
      return NextResponse.json(
        { error: 'Invalid action. Use: cache or mutations' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[API /api/offline/sync] Error:', error);
    console.error('[API /api/offline/sync] Error stack:', error instanceof Error ? error.stack : 'N/A');
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}
