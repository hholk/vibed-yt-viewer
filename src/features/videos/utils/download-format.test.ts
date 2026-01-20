import { describe, expect, it } from 'vitest';

import {
  selectAudioFormat,
  selectVideoFormat,
} from './download-format';

type TestFormat = {
  id: string;
  qualityLabel?: string | null;
  height?: number | null;
  audioBitrate?: number | null;
};

describe('download format selection', () => {
  it('selects a matching video quality label when available', () => {
    const formats: TestFormat[] = [
      { id: 'a', qualityLabel: '360p', height: 360 },
      { id: 'b', qualityLabel: '720p', height: 720 },
    ];

    const selected = selectVideoFormat(formats, '720p');

    expect(selected?.id).toBe('b');
  });

  it('falls back to the highest resolution when no match exists', () => {
    const formats: TestFormat[] = [
      { id: 'a', qualityLabel: '360p', height: 360 },
      { id: 'b', qualityLabel: '1080p', height: 1080 },
    ];

    const selected = selectVideoFormat(formats, '480p');

    expect(selected?.id).toBe('b');
  });

  it('selects audio quality by bitrate level', () => {
    const formats: TestFormat[] = [
      { id: 'low', audioBitrate: 64 },
      { id: 'medium', audioBitrate: 128 },
      { id: 'high', audioBitrate: 256 },
    ];

    expect(selectAudioFormat(formats, 'low')?.id).toBe('low');
    expect(selectAudioFormat(formats, 'medium')?.id).toBe('medium');
    expect(selectAudioFormat(formats, 'high')?.id).toBe('high');
  });
});
