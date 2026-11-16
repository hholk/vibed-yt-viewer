import { describe, it, expect } from 'vitest';
import { parseFilters, withFilters, filterVideos } from './filters';
import { videoListItemSchema } from '../api/schemas';

describe('URL filters', () => {
  it('round trips percent, colon, plus, unicode and encoded-looking values once', () => {
    for (const value of ['100%', 'x:y', 'a+b', 'Grüße', '%2F', '%broken']) {
      const filters = [{ type: 'channel' as const, value, label: value }];
      expect(parseFilters(new URLSearchParams(withFilters(new URLSearchParams(), filters).toString()))).toEqual(filters);
    }
  });
  it('rejects missing values and unknown/prototype keys and deduplicates', () => {
    expect(parseFilters(new URLSearchParams('f=__proto__:x&f=constructor:x&f=channel:&f=bad&f=channel:A&f=channel:A'))).toEqual([{ type: 'channel', value: 'A', label: 'A' }]);
  });
  it('preserves unrelated query values and removes all filters on clear', () => {
    const params = new URLSearchParams('sort=Title&q=100%25&f=channel:A&f=genre:X');
    expect(withFilters(params, []).toString()).toBe('sort=Title&q=100%25');
    expect(params.getAll('f')).toHaveLength(2);
  });
  it('uses AND semantics and current linked-record fields', () => {
    const videos = [
      videoListItemSchema.parse({ Id: 1, VideoID: 'a', Title: 'A', Channel: 'X', Persons: [{ Title: 'Ada' }] }),
      videoListItemSchema.parse({ Id: 2, VideoID: 'b', Title: 'B', Channel: 'Y', Persons: [{ Title: 'Ada' }] }),
    ];
    expect(filterVideos(videos, parseFilters(new URLSearchParams('f=person:Ada&f=channel:X'))).map(v => v.Id)).toEqual([1]);
    expect(filterVideos(videos, [])).toEqual(videos);
  });
});
