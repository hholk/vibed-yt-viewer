export const DEFAULT_VIDEO_QUALITY = '720p';
export const DEFAULT_AUDIO_QUALITY = 'high';

export type DownloadType = 'video' | 'audio';

export type SimpleFormat = {
  qualityLabel?: string | null;
  height?: number | null;
  audioBitrate?: number | null;
};

const AUDIO_QUALITY_ORDER = ['low', 'medium', 'high'] as const;

type AudioQuality = (typeof AUDIO_QUALITY_ORDER)[number];

const normalizeAudioQuality = (value: string): AudioQuality => {
  if (value === 'low' || value === 'medium' || value === 'high') {
    return value;
  }
  return DEFAULT_AUDIO_QUALITY;
};

/**
 * Select the best video format that matches a requested quality label.
 * Falls back to the highest resolution if no exact match is found.
 */
export const selectVideoFormat = <T extends SimpleFormat>(
  formats: T[],
  qualityLabel: string,
): T | undefined => {
  if (formats.length === 0) {
    return undefined;
  }

  const normalizedLabel = qualityLabel.toLowerCase();
  const exactMatch = formats.find(format =>
    format.qualityLabel?.toLowerCase() === normalizedLabel,
  );

  if (exactMatch) {
    return exactMatch;
  }

  return [...formats]
    .sort((a, b) => (b.height ?? 0) - (a.height ?? 0))
    .find(format => (format.height ?? 0) > 0);
};

/**
 * Select an audio format based on a friendly quality label.
 * - high: highest bitrate
 * - medium: middle bitrate
 * - low: lowest bitrate
 */
export const selectAudioFormat = <T extends SimpleFormat>(
  formats: T[],
  audioQuality: string,
): T | undefined => {
  if (formats.length === 0) {
    return undefined;
  }

  const normalizedQuality = normalizeAudioQuality(audioQuality);
  const sorted = [...formats].sort(
    (a, b) => (a.audioBitrate ?? 0) - (b.audioBitrate ?? 0),
  );

  if (normalizedQuality === 'low') {
    return sorted[0];
  }

  if (normalizedQuality === 'medium') {
    return sorted[Math.floor(sorted.length / 2)];
  }

  return sorted[sorted.length - 1];
};
