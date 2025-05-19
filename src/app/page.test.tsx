/// <reference types="vitest/globals" />
import { render, screen, waitFor } from '@testing-library/react';
import type { JSX } from 'react';
// Remove direct import of Page component here
// import Page from './page';
import * as NocoDB from '@/lib/nocodb';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import type { Video } from '@/lib/nocodb'; // Import Video type

// Mock NocoDB module
vi.mock('@/lib/nocodb', async (importOriginal) => {
  const original = await importOriginal<typeof NocoDB>();
  return {
    ...original,
    fetchAllVideos: vi.fn(), // Mock fetchAllVideos
    videoSchema: original.videoSchema 
  };
});

const mockedFetchAllVideos = NocoDB.fetchAllVideos as vi.MockedFunction<typeof NocoDB.fetchAllVideos>;

// Mock useSearchParams
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => ({
    get: vi.fn((param: string) => {
      if (param === 'sort') return null; 
      return null;
    }),
  }),
}));

const mockVideosData: Video[] = [
  {
    Id: 1,
    VideoID: 'vid1',
    URL: 'http://example.com/vid1',
    ThumbHigh: 'http://example.com/thumb1.jpg',
    Title: 'Video Title 1',
    Channel: 'Channel Name 1',
    Description: 'Desc 1',
    ImportanceRating: 5,
    PersonalComment: 'Comment 1',
    CreatedAt: new Date(),
    UpdatedAt: new Date(),
    PublishedAt: new Date(),
    Tags: [{ name: 'Tag1' }, { name: 'Tag2' }],
    Categories: [{ name: 'Cat1' }],
    FullTranscript: 'Full transcript for video 1...',
    ActionableAdvice: 'Actionable advice for video 1...',
    NarrativeFlow: 'Narrative flow for video 1...',
    TLDR: 'TLDR for video 1.',
    MainSummary: 'Main summary for video 1.',
    Transcript: 'Short transcript for video 1.',
    Prompt: null, Persons: null, Companies: null, InvestableAssets: null, Indicators: null, Trends: null, Hashtags: null, Institutions: null, KeyExamples: null, MemorableTakeaways: null, VideoGenre: null, Sentiment: null, PrimarySources: null, MainTopic: null, DetailedNarrativeFlow: null, KeyNumbersData: null, MemorableQuotes: null, "Book-/Media-Recommandations": null, Speaker: null, "$Ticker": null, "Events/Fairs": null, URLs: null, SentimentReason: null, TechnicalTerms: null, DOIs: null, nc___: null, __nc_evolve_to_text__: null, "Created By": null, "Updated By": null,
  },
  {
    Id: 2,
    VideoID: 'vid2',
    URL: 'http://example.com/vid2',
    ThumbHigh: 'http://example.com/thumb2.jpg',
    Title: 'Video Title 2',
    Channel: 'Channel Name 2',
    Description: 'Desc 2',
    ImportanceRating: 4,
    PersonalComment: 'Comment 2',
    CreatedAt: new Date(),
    UpdatedAt: new Date(),
    PublishedAt: new Date(),
    Tags: [{ name: 'Tag3' }],
    Categories: [{ name: 'Cat2' }],
    FullTranscript: 'Full transcript for video 2...',
    ActionableAdvice: null, NarrativeFlow: null, TLDR: null, MainSummary: null, Transcript: null, Prompt: null, Persons: null, Companies: null, InvestableAssets: null, Indicators: null, Trends: null, Hashtags: null, Institutions: null, KeyExamples: null, MemorableTakeaways: null, VideoGenre: null, Sentiment: null, PrimarySources: null, MainTopic: null, DetailedNarrativeFlow: null, KeyNumbersData: null, MemorableQuotes: null, "Book-/Media-Recommandations": null, Speaker: null, "$Ticker": null, "Events/Fairs": null, URLs: null, SentimentReason: null, TechnicalTerms: null, DOIs: null, nc___: null, __nc_evolve_to_text__: null, "Created By": null, "Updated By": null,
  },
  {
    Id: 3,
    VideoID: 'vid3',
    URL: 'http://example.com/vid3',
    ThumbHigh: 'http://example.com/thumb3.jpg',
    Title: 'Video Title 3',
    Channel: 'Channel Name 3',
    Description: 'Desc 3',
    ImportanceRating: 3,
    PersonalComment: 'Comment 3',
    CreatedAt: new Date(),
    UpdatedAt: new Date(),
    PublishedAt: new Date(),
    Tags: [], Categories: [],
    FullTranscript: null, ActionableAdvice: null, NarrativeFlow: null, TLDR: null, MainSummary: null, Transcript: null, Prompt: null, Persons: null, Companies: null, InvestableAssets: null, Indicators: null, Trends: null, Hashtags: null, Institutions: null, KeyExamples: null, MemorableTakeaways: null, VideoGenre: null, Sentiment: null, PrimarySources: null, MainTopic: null, DetailedNarrativeFlow: null, KeyNumbersData: null, MemorableQuotes: null, "Book-/Media-Recommandations": null, Speaker: null, "$Ticker": null, "Events/Fairs": null, URLs: null, SentimentReason: null, TechnicalTerms: null, DOIs: null, nc___: null, __nc_evolve_to_text__: null, "Created By": null, "Updated By": null,
  },
];

interface HomePageProps {
  searchParams: Promise<{
    sort?: string;
    [key: string]: string | string[] | undefined;
  }>;
}

type HomePageComponentType = (props: HomePageProps) => Promise<JSX.Element>;

describe('Page (Video List)', () => {
  let Page: HomePageComponentType;

  beforeEach(async () => {
    mockedFetchAllVideos.mockReset();
    const pageModule = await import('./page');
    Page = pageModule.default;
  });

  it('should render video items when fetchAllVideos returns data', async () => {
    mockedFetchAllVideos.mockResolvedValue(mockVideosData);
    const PageComponent = await Page({ searchParams: { sort: undefined } });
    render(PageComponent);
    await waitFor(() => {
      expect(screen.getByText('Video Title 1')).toBeInTheDocument();
    });
    expect(screen.getByText('Video Title 2')).toBeInTheDocument();
    expect(screen.getByText('Video Title 3')).toBeInTheDocument();
    if (mockVideosData[0].Channel) expect(screen.getByText(mockVideosData[0].Channel)).toBeInTheDocument();
  });

  it('should display an error message when fetchAllVideos fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockedFetchAllVideos.mockRejectedValue(new Error('Simulated fetch failure'));
    const PageComponent = await Page({ searchParams: { sort: undefined } });
    render(PageComponent);
    await waitFor(() => {
      expect(screen.getByText('Error Fetching Videos')).toBeInTheDocument();
      expect(screen.getByText('Simulated fetch failure')).toBeInTheDocument();
    });
    consoleErrorSpy.mockRestore();
  });

  it('should display a "no videos" message when fetchAllVideos returns empty array', async () => {
    mockedFetchAllVideos.mockResolvedValue([]);
    const PageComponent = await Page({ searchParams: { sort: undefined } });
    render(PageComponent);
    await waitFor(() => {
      expect(screen.getByText('No videos found.')).toBeInTheDocument();
      expect(screen.getByText('There are currently no videos to display.')).toBeInTheDocument();
    });
  });
  
  it('should render video items without a channel if channel is null or undefined', async () => {
    const videosWithMissingChannel = [
      {
        ...mockVideosData[0],
        Channel: null,
      },
      {
        ...mockVideosData[1],
        Id: 4, 
        VideoID: 'vid4',
        Channel: undefined,
        ThumbHigh: 'http://example.com/thumb4.jpg',
        Title: 'Video Title 4',
      },
    ];
    mockedFetchAllVideos.mockResolvedValue(videosWithMissingChannel as unknown as Video[]);
    const PageComponent = await Page({ searchParams: { sort: undefined } });
    render(PageComponent);
    await waitFor(() => {
      expect(screen.getByText('Video Title 1')).toBeInTheDocument();
    });
    expect(screen.queryByText('Channel Name 1')).not.toBeInTheDocument(); 
    expect(screen.getByText('Video Title 4')).toBeInTheDocument();
    expect(screen.queryByText('Channel Name 2')).not.toBeInTheDocument();
  });

  it('should render a placeholder if ThumbHigh is null', async () => {
    const videoWithNoThumb = [
      {
        ...mockVideosData[0],
        ThumbHigh: null,
      },
    ];
    mockedFetchAllVideos.mockResolvedValue(videoWithNoThumb as unknown as Video[]);
    const PageComponent = await Page({ searchParams: { sort: undefined } });
    render(PageComponent);
    await waitFor(() => {
        expect(screen.getByText('No Thumbnail')).toBeInTheDocument();
    });
    expect(screen.queryByAltText(`Thumbnail for ${videoWithNoThumb[0].Title}`)).not.toBeInTheDocument();
  });
});
