import { filterVideos, type FilterOption } from './filterVideos';
import type { VideoListItem } from './nocodb';

describe('filterVideos', () => {
  const videos: VideoListItem[] = [
    { Id: 1, VideoID: 'a', Title: 'A', ThumbHigh: null, Channel: 'Foo', Description: null, VideoGenre: null, Persons: null, Companies: null, Indicators: null, Trends: null, InvestableAssets: null, TickerSymbol: null, Institutions: null, EventsFairs: null, DOIs: null, Hashtags: null, MainTopic: null, PrimarySources: null, Sentiment: null, SentimentReason: null, TechnicalTerms: null, Speaker: null },
    { Id: 2, VideoID: 'b', Title: 'B', ThumbHigh: null, Channel: 'Bar', Description: null, VideoGenre: 'Podcast', Persons: null, Companies: null, Indicators: null, Trends: null, InvestableAssets: null, TickerSymbol: null, Institutions: null, EventsFairs: null, DOIs: null, Hashtags: null, MainTopic: null, PrimarySources: null, Sentiment: null, SentimentReason: null, TechnicalTerms: null, Speaker: null },
  ];

  it('filters by channel', () => {
    const filters: FilterOption[] = [{ label: 'Foo', value: 'Foo', type: 'channel' }];
    expect(filterVideos(videos, filters).length).toBe(1);
  });
});
