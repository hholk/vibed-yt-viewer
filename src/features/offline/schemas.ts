import { z } from 'zod';
import { videoSchema } from '@/features/videos/api/schemas';

/**
 * VideoOffline Schema - Video ohne Transkript-Felder
 *
 * Felder die ausgeschlossen werden:
 * - FullTranscript (~50-200 KB)
 * - Transcript (~50-200 KB)
 *
 * DetailedNarrativeFlow wird BEHALTEN (wichtig für Zusammenfassungen)
 *
 * Geschätzte Größe pro Video: ~10-15 KB
 * 2000 Videos: ~20-30 MB (unter 40 MB Limit)
 */
export const videoOfflineSchema = videoSchema.omit({
  FullTranscript: true,
  Transcript: true,
});

export type VideoOffline = z.infer<typeof videoOfflineSchema>;

/**
 * Pending Mutation für Offline-Änderungen
 */
export const pendingMutationSchema = z.object({
  id: z.string(), // UUID
  type: z.enum(['UPDATE', 'DELETE']),
  videoId: z.number().int(),
  timestamp: z.number(),
  data: z.record(z.unknown()).optional(), // Partial<Video>
  retryCount: z.number().int().default(0),
  error: z.string().optional().nullable(),
});

export type PendingMutation = z.infer<typeof pendingMutationSchema>;

/**
 * Sync Result
 */
export const syncResultSchema = z.object({
  videosUpdated: z.number().int(),
  mutationsSynced: z.number().int(),
  errors: z.array(z.unknown()),
  lastSyncTime: z.number(),
});

export type SyncResult = z.infer<typeof syncResultSchema>;
