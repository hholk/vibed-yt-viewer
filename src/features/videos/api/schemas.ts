import { z } from 'zod';

/**
 * Zod preprocessors convert inconsistent NocoDB payloads into predictable
 * shapes before validation happens. Beginners can think of them as lightweight
 * transformers that run before the schema checks the data.
 */
const preprocessors = {
  stringToArrayOrNull: (val: unknown): string[] | null => {
    if (typeof val === 'string') {
      if (val.trim() === '') return [];
      return val
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s !== '');
    }
    if (Array.isArray(val)) return val as string[];
    if (typeof val === 'object' && val !== null && Object.keys(val).length === 0) return [];
    return null;
  },
  stringToLinkedRecordArray: (
    val: unknown,
  ): Array<{ Id?: number | string; Title?: string | null; name?: string | null }> | null => {
    if (typeof val === 'string') {
      if (val.trim() === '') return [];
      return val
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s !== '')
        .map((itemTitle) => ({ Title: itemTitle, name: itemTitle }));
    }
    if (Array.isArray(val)) return val as Array<{ Id?: number | string; Title?: string | null; name?: string | null }>;
    if (typeof val === 'object' && val !== null && Object.keys(val).length === 0) return [];
    return null;
  },
  emptyObjectToNull: (val: unknown) =>
    typeof val === 'object' && val !== null && !Array.isArray(val) && Object.keys(val).length === 0 ? null : val,
  parseSentiment: (val: unknown) => {
    if (val === null || val === undefined) return null;
    const num = Number(val);
    return Number.isNaN(num) ? null : num;
  },
  extractUrlFromArray: (val: unknown) => {
    if (Array.isArray(val) && val.length > 0 && val[0] && typeof val[0] === 'object' && 'url' in val[0]) {
      try {
        const parsedUrl = new URL((val[0] as { url: string }).url);
        if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
          return (val[0] as { url: string }).url;
        }
        return null;
      } catch {
        return null;
      }
    }
    if (typeof val === 'string') return val;
    return null;
  },
};

const linkedRecordItemSchema = z
  .object({
    Id: z.union([z.number().int(), z.string()]).optional(),
    Title: z.string().optional().nullable(),
    name: z.string().optional().nullable(),
  })
  .passthrough();

export const videoSchema = z
  .object({
    Id: z.number().int(),
    rowId: z.string().optional().nullable(),
    RowId: z.string().optional().nullable(),
    _rowId: z.string().optional().nullable(),
    VideoID: z.string().nullable(),
    URL: z.string().url().optional().nullable(),
    ThumbHigh: z.preprocess(preprocessors.extractUrlFromArray, z.string().url().nullable()),
    Title: z.string().nullable(),
    Channel: z.string().optional().nullable().default(null),
    Description: z.string().optional().nullable().default(null),
    ImportanceRating: z.number().int().min(1).max(5).optional().nullable().default(null),
    PersonalComment: z.string().optional().nullable().default(null),
    CreatedAt: z.coerce.date().optional().nullable().default(null),
    UpdatedAt: z.coerce.date().optional().nullable().default(null),
    PublishedAt: z.coerce.date().optional().nullable().default(null),
    Tags: z.preprocess(
      preprocessors.stringToLinkedRecordArray,
      z.array(linkedRecordItemSchema).nullable().default([]).optional(),
    ),
    Categories: z.preprocess(
      preprocessors.stringToLinkedRecordArray,
      z.array(linkedRecordItemSchema).nullable().default([]).optional(),
    ),
    CompletionDate: z.coerce.date().optional().nullable().default(null),
    FullTranscript: z.string().optional().nullable().default(null),
    ActionableAdvice: z.string().optional().nullable().default(null),
    Archived: z.boolean().optional().nullable().default(null),
    AssignedTo: z.union([linkedRecordItemSchema, z.string()]).optional().nullable().default(null),
    BitRate: z.string().optional().nullable().default(null),
    TLDR: z.string().optional().nullable().default(null),
    Task: z.string().optional().nullable().default(null),
    MainSummary: z.string().optional().nullable().default(null),
    Mood: z.preprocess(
      preprocessors.emptyObjectToNull,
      z.array(z.string()).nullable().default([]).optional(),
    ),
    DetailedNarrativeFlow: z.string().optional().nullable().default(null),
    DueDate: z.coerce.date().optional().nullable().default(null),
    Duration: z.number().optional().nullable().default(null),
    MemorableQuotes: z.preprocess(
      preprocessors.stringToArrayOrNull,
      z.array(z.string()).nullable().default([]).optional(),
    ),
    MemorableTakeaways: z.preprocess(
      preprocessors.stringToArrayOrNull,
      z.array(z.string()).nullable().default([]).optional(),
    ),
    Notes: z.string().optional().nullable().default(null),
    Watched: z.boolean().optional().nullable().default(null),
    OriginalTitle: z.string().optional().nullable().default(null),
    OriginalChannel: z.string().optional().nullable().default(null),
    Indicators: z.preprocess(
      preprocessors.stringToLinkedRecordArray,
      z.array(linkedRecordItemSchema).nullable().default([]).optional(),
    ),
    Trends: z.preprocess(
      preprocessors.stringToLinkedRecordArray,
      z.array(linkedRecordItemSchema).nullable().default([]).optional(),
    ),
    Locations: z.preprocess(
      preprocessors.stringToLinkedRecordArray,
      z.array(linkedRecordItemSchema).nullable().default([]).optional(),
    ),
    Events: z.preprocess(
      preprocessors.stringToLinkedRecordArray,
      z.array(linkedRecordItemSchema).nullable().default([]).optional(),
    ),
    FileFormat: z.string().optional().nullable().default(null),
    FileSize: z.string().optional().nullable().default(null),
    FrameRate: z.number().optional().nullable().default(null),
    Hashtags: z.preprocess(
      preprocessors.stringToArrayOrNull,
      z.array(z.string()).nullable().default([]).optional(),
    ),
    Language: z.string().optional().nullable().default(null),
    MainTopic: z.string().optional().nullable().default(null),
    Priority: z.string().optional().nullable().default(null),
    Private: z.boolean().optional().nullable().default(null),
    Products: z.preprocess(
      preprocessors.stringToLinkedRecordArray,
      z.array(linkedRecordItemSchema).nullable().default([]).optional(),
    ),
    Project: z.string().optional().nullable().default(null),
    Resolution: z.string().optional().nullable().default(null),
    Source: z.string().optional().nullable().default(null),
    TopicsDiscussed: z.preprocess(
      preprocessors.emptyObjectToNull,
      z.array(z.string()).nullable().default([]).optional(),
    ),
    Speaker: z.string().optional().nullable().default(null),
    Status: z.string().optional().nullable().default(null),
    Subtitles: z
      .union([z.boolean(), z.preprocess(preprocessors.emptyObjectToNull, z.array(z.string()))])
      .optional()
      .nullable()
      .default(null),
    Speakers: z.preprocess(
      preprocessors.stringToLinkedRecordArray,
      z.array(linkedRecordItemSchema).nullable().default([]).optional(),
    ),
    Transcript: z.string().optional().nullable().default(null),
    KeyNumbersData: z.unknown().optional().nullable().default(null),
    KeyExamples: z.preprocess(
      preprocessors.stringToArrayOrNull,
      z.array(z.string()).nullable().default([]).optional(),
    ),
    BookMediaRecommendations: z.preprocess(
      preprocessors.emptyObjectToNull,
      z.array(z.string()).nullable().default([]).optional(),
    ),
    RelatedURLs: z.preprocess(
      preprocessors.emptyObjectToNull,
      z.array(z.string().url()).nullable().default([]).optional(),
    ),
    VideoGenre: z.string().optional().nullable().default(null),
    Persons: z.preprocess(
      preprocessors.stringToLinkedRecordArray,
      z.array(linkedRecordItemSchema).nullable().default([]).optional(),
    ),
    Companies: z.preprocess(
      preprocessors.stringToLinkedRecordArray,
      z.array(linkedRecordItemSchema).nullable().default([]).optional(),
    ),
    InvestableAssets: z.preprocess(
      preprocessors.stringToArrayOrNull,
      z.array(z.string()).nullable().default([]).optional(),
    ),
    TickerSymbol: z.string().optional().nullable().default(null),
    Institutions: z.preprocess(
      preprocessors.stringToLinkedRecordArray,
      z.array(linkedRecordItemSchema).nullable().default([]).optional(),
    ),
    EventsFairs: z.preprocess(
      preprocessors.emptyObjectToNull,
      z.array(z.string()).nullable().default([]).optional(),
    ),
    DOIs: z.preprocess(
      preprocessors.emptyObjectToNull,
      z.array(z.string()).nullable().default([]).optional(),
    ),
    PrimarySources: z.preprocess(
      preprocessors.stringToArrayOrNull,
      z.array(z.string()).nullable().default([]).optional(),
    ),
    Sentiment: z
      .preprocess(preprocessors.parseSentiment, z.number().nullable().default(null))
      .optional(),
    SentimentReason: z.string().optional().nullable().default(null),
    TechnicalTerms: z.preprocess(
      preprocessors.stringToArrayOrNull,
      z.array(z.string()).nullable().default([]).optional(),
    ),
    Prompt: z.string().optional().nullable().default(null),
    nc___: z.unknown().optional(),
    __nc_evolve_to_text__: z.unknown().optional(),
    'Created By': z.string().optional().nullable(),
    'Updated By': z.string().optional().nullable(),
  })
  .catchall(z.unknown())
  .describe('videoSchema_detailed');

export type Video = z.infer<typeof videoSchema>;

/**
 * Offline cache payload
 *
 * This schema is intentionally a subset of `videoSchema` so the offline cache
 * stays small while still supporting the detail view (summaries, notes, ratings).
 * Transcript fields are deliberately excluded.
 */
export const videoOfflineCacheItemSchema = videoSchema
  .pick({
    Id: true,
    rowId: true,
    RowId: true,
    _rowId: true,
    VideoID: true,
    URL: true,
    ThumbHigh: true,
    Title: true,
    Channel: true,
    Description: true,
    VideoGenre: true,
    Persons: true,
    Companies: true,
    Indicators: true,
    Trends: true,
    InvestableAssets: true,
    TickerSymbol: true,
    Institutions: true,
    EventsFairs: true,
    DOIs: true,
    Hashtags: true,
    MainTopic: true,
    PrimarySources: true,
    Sentiment: true,
    SentimentReason: true,
    TechnicalTerms: true,
    Speaker: true,
    CreatedAt: true,
    UpdatedAt: true,
    PublishedAt: true,
    ImportanceRating: true,
    PersonalComment: true,
    Watched: true,
    Notes: true,
    Tags: true,
    Categories: true,
    CompletionDate: true,
    ActionableAdvice: true,
    TLDR: true,
    MainSummary: true,
    DetailedNarrativeFlow: true,
    MemorableQuotes: true,
    MemorableTakeaways: true,
    KeyExamples: true,
    BookMediaRecommendations: true,
    RelatedURLs: true,
    TopicsDiscussed: true,
    Speakers: true,
    Subtitles: true,
    Duration: true,
    Language: true,
    Priority: true,
    Status: true,
  })
  .extend({
    // Be tolerant in the offline cache: malformed URLs should not break the whole sync payload.
    URL: z.preprocess(preprocessors.extractUrlFromArray, z.string().optional().nullable()),
    RelatedURLs: z.preprocess(
      preprocessors.emptyObjectToNull,
      z.array(z.string()).nullable().default([]).optional(),
    ),
  })
  .describe('videoOfflineCacheItemSchema');

export type VideoOfflineCacheItem = z.infer<typeof videoOfflineCacheItemSchema>;

export const videoListItemSchema = z
  .object({
    Id: z.number().int(),
    rowId: z.string().optional().nullable(),
    RowId: z.string().optional().nullable(),
    _rowId: z.string().optional().nullable(),
    Title: z.string().nullable(),
    ThumbHigh: z.preprocess(
      (val) => {
        if (Array.isArray(val) && val.length > 0 && val[0] && typeof (val[0] as { url?: unknown }).url === 'string') {
          return (val[0] as { url: string }).url;
        }
        if (typeof val === 'string') {
          return val;
        }
        return null;
      },
      z.string().url().nullable(),
    ),
    Channel: z.string().optional().nullable(),
    Description: z.string().optional().nullable(),
    VideoGenre: z.string().optional().nullable(),
    Persons: z.preprocess(
      preprocessors.stringToLinkedRecordArray,
      z.array(linkedRecordItemSchema).nullable().default([]).optional(),
    ),
    Companies: z.preprocess(
      preprocessors.stringToLinkedRecordArray,
      z.array(linkedRecordItemSchema).nullable().default([]).optional(),
    ),
    Indicators: z.preprocess(
      preprocessors.stringToLinkedRecordArray,
      z.array(linkedRecordItemSchema).nullable().default([]).optional(),
    ),
    Trends: z.preprocess(
      preprocessors.stringToLinkedRecordArray,
      z.array(linkedRecordItemSchema).nullable().default([]).optional(),
    ),
    InvestableAssets: z.preprocess(
      preprocessors.stringToArrayOrNull,
      z.array(z.string()).nullable().default([]).optional(),
    ),
    Institutions: z.preprocess(
      preprocessors.stringToLinkedRecordArray,
      z.array(linkedRecordItemSchema).nullable().default([]).optional(),
    ),
    EventsFairs: z.preprocess(
      preprocessors.emptyObjectToNull,
      z.array(z.string()).nullable().default([]).optional(),
    ),
    DOIs: z.preprocess(
      preprocessors.emptyObjectToNull,
      z.array(z.string()).nullable().default([]).optional(),
    ),
    Hashtags: z.preprocess(
      preprocessors.stringToArrayOrNull,
      z.array(z.string()).nullable().default([]).optional(),
    ),
    PrimarySources: z.preprocess(
      preprocessors.stringToArrayOrNull,
      z.array(z.string()).nullable().default([]).optional(),
    ),
    Sentiment: z
      .preprocess(preprocessors.parseSentiment, z.number().nullable().default(null))
      .optional(),
    TechnicalTerms: z.preprocess(
      preprocessors.stringToArrayOrNull,
      z.array(z.string()).nullable().default([]).optional(),
    ),
    Speaker: z.string().optional().nullable(),
    VideoID: z.string().nullable(),
    CreatedAt: z.coerce.date().optional().nullable().default(null),
  })
  .describe('videoListItemSchema_grid');

export type VideoListItem = z.infer<typeof videoListItemSchema>;

export const pageInfoSchema = z.object({
  totalRows: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  isFirstPage: z.boolean().optional(),
  isLastPage: z.boolean(),
  hasNextPage: z.boolean().optional(),
  hasPreviousPage: z.boolean().optional(),
});

export type PageInfo = z.infer<typeof pageInfoSchema>;

export const createNocoDBResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    list: z.array(itemSchema),
    pageInfo: pageInfoSchema,
  });
