export type { NocoDBConfig } from './config';
export { getNocoDBConfig } from './config';

export {
  videoSchema,
  videoOfflineCacheItemSchema,
  videoListItemSchema,
  pageInfoSchema,
  createNocoDBResponseSchema,
  type Video,
  type VideoOfflineCacheItem,
  type VideoListItem,
  type PageInfo,
} from './schemas';

export {
  fetchVideos,
  fetchAllVideos,
  fetchVideoByVideoId,
  getSimpleNavigationData,
  getVideoNavigationData,
} from './video-service';

export {
  updateVideo,
  deleteVideo,
  normalizeImportanceRating,
  normalizePersonalComment,
} from './mutations';

export { resolveNumericId } from './record-utils';
