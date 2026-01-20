'use client';

import type { MouseEvent } from 'react';
import { useMemo, useState } from 'react';

import { Button } from '@/shared/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  DEFAULT_AUDIO_QUALITY,
  DEFAULT_VIDEO_QUALITY,
  type DownloadType,
} from '@/features/videos/utils/download-format';

const VIDEO_QUALITY_OPTIONS = ['1080p', '720p', '480p', '360p'] as const;
const AUDIO_QUALITY_OPTIONS = ['high', 'medium', 'low'] as const;

interface DownloadControlsProps {
  videoId: string | null;
  title?: string | null;
}

/**
 * Download controls for video/audio with selectable quality.
 * This component stays client-side because it manages user interaction state.
 */
export function DownloadControls({ videoId, title }: DownloadControlsProps) {
  const [downloadType, setDownloadType] = useState<DownloadType>('video');
  const [quality, setQuality] = useState(DEFAULT_VIDEO_QUALITY);

  const qualityOptions = useMemo(() => {
    return downloadType === 'video'
      ? VIDEO_QUALITY_OPTIONS
      : AUDIO_QUALITY_OPTIONS;
  }, [downloadType]);

  const isDownloadDisabled = !videoId;

  const downloadUrl = useMemo(() => {
    if (!videoId) {
      return '#';
    }

    const params = new URLSearchParams({
      type: downloadType,
      quality,
    });

    return `/api/videos/${videoId}/download?${params.toString()}`;
  }, [videoId, downloadType, quality]);

  const handleDownloadClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (isDownloadDisabled) {
      event.preventDefault();
    }
  };

  const handleTypeChange = (value: DownloadType) => {
    setDownloadType(value);
    setQuality(value === 'video' ? DEFAULT_VIDEO_QUALITY : DEFAULT_AUDIO_QUALITY);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={downloadType} onValueChange={handleTypeChange}>
        <SelectTrigger className="w-[140px]" size="sm" aria-label="Download type">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="video">Video</SelectItem>
          <SelectItem value="audio">Audio</SelectItem>
        </SelectContent>
      </Select>

      <Select value={quality} onValueChange={setQuality}>
        <SelectTrigger className="w-[120px]" size="sm" aria-label="Quality">
          <SelectValue placeholder="Quality" />
        </SelectTrigger>
        <SelectContent>
          {qualityOptions.map(option => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button asChild size="sm" disabled={isDownloadDisabled}>
        <a
          href={downloadUrl}
          download
          aria-disabled={isDownloadDisabled}
          aria-label={`Download ${title ?? 'video'}`}
          onClick={handleDownloadClick}
        >
          Download
        </a>
      </Button>
    </div>
  );
}
