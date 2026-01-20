export type SavedVideo = {
  id: string;
  title: string;
  channel?: string | null;
  duration?: string | null;
  url: string;
  thumbnailUrl?: string | null;
  addedAt: string;
};
