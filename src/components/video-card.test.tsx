vi.mock("next/image", () => ({ __esModule: true, default: (props: any) => (<img {...props} />) }));
import { render } from '@testing-library/react';
import { VideoCard } from './video-card';
import type { VideoListItem } from '@/lib/nocodb';

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
    const { getByRole } = render(<VideoCard video={sample} />);
    const link = getByRole('link');
    expect(link).toHaveAttribute('href', '/video/abc123');
  });
});
