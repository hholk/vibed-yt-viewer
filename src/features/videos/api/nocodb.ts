export type { NocoDBConfig } from './config';
export { getNocoDBConfig } from './config';

export {
  videoSchema,
  videoListItemSchema,
  pageInfoSchema,
  createNocoDBResponseSchema,
  type Video,
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
  updateVideoSimple,
  deleteVideo,
  normalizeImportanceRating,
  normalizePersonalComment,
} from './mutations';

export { resolveNumericId } from './record-utils';
