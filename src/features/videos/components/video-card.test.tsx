/* eslint-disable @next/next/no-img-element */
// Import Vitest test globals for mocking and testing
import { describe, it, expect, vi } from 'vitest';
// Mock the next/image module to return a simple img tag for testing purposes.
// The props type is set to React.ImgHTMLAttributes<HTMLImageElement> to match the props of the img tag.
vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; priority?: boolean }) => {
    const { fill: _fill, priority: _priority, ...rest } = props;
    void _fill;
    void _priority;
    const { alt, ...imgProps } = rest;
    return <img {...imgProps} alt={(alt as string) ?? ''} />;
  },
}));

import { render } from '@testing-library/react';
import { VideoCard } from './video-card';
import type { VideoListItem } from '@/features/videos/api/nocodb';

// Use a specific type for mockVideo instead of 'any'. 
// Here, we use Partial<VideoListItem> to allow for partial video data.
const sample: VideoListItem = {
  Id: 1,
  Title: 'Test Video',
  VideoID: 'abc123',
  ThumbHigh: 'http://example.com/thumb.jpg',
  Channel: 'Channel',
  Description: 'Desc',
  VideoGenre: null,
  Persons: null,
  Companies: null,
  Indicators: null,
  Trends: null,
  InvestableAssets: null,
  TickerSymbol: null,
  Institutions: null,
  EventsFairs: null,
  DOIs: null,
  Hashtags: null,
  MainTopic: null,
  PrimarySources: null,
  Sentiment: null,
  SentimentReason: null,
  TechnicalTerms: null,
  Speaker: null,
};

describe('VideoCard', () => {
  it('renders link to video page', () => {
    const { getAllByRole } = render(<VideoCard video={sample} />);
    const links = getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', '/video/abc123');
    expect(links[1]).toHaveAttribute('href', '/api/videos/abc123/download');
  });
});
