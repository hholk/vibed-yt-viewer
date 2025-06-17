export type FilterType =
  | 'person'
  | 'company'
  | 'genre'
  | 'indicator'
  | 'trend'
  | 'asset'
  | 'ticker'
  | 'institution'
  | 'event'
  | 'doi'
  | 'hashtag'
  | 'mainTopic'
  | 'primarySource'
  | 'sentiment'
  | 'sentimentReason'
  | 'channel'
  | 'description'
  | 'technicalTerm'
  | 'speaker';

export interface FilterOption {
  label: string;
  value: string;
  type: FilterType;
}
