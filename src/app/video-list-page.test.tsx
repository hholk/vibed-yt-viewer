import { render, screen } from '@testing-library/react';
import VideoListPage from './video-list-page'; // Adjusted import path
import * as NocoDB from '@/lib/nocodb';
import {beforeEach, describe, it, expect, vi} from 'vitest';

vi.mock('@/lib/nocodb', async (importOriginal) => {
  const original = await importOriginal<typeof NocoDB>();
  return {
    ...original,
    fetchVideos: vi.fn(),
  };
});

const mockedFetchVideos = NocoDB.fetchVideos as vi.MockedFunction<typeof NocoDB.fetchVideos>;

const mockVideosData: NocoDB.Video[] = [
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
    Transcript: null,
    Source: 'YouTube',
    Duration: 120,
    PublishedAt: new Date().toISOString(),
    Watched: false,
    Archived: false,
    Tags: ['Tag1', 'Tag2'],
    CreatedAt: new Date().toISOString(),
    UpdatedAt: new Date().toISOString(),
    Notes: 'Test notes 1',
    SubtitleLanguage: 'en',
    DateAdded: new Date().toISOString(),
    Views: 1000,
    Likes: 100,
    CommentsCount: 10,
    PrivacyStatus: 'public',
    Resolution: '1080p',
    ThumbnailDefault: 'http://example.com/thumb_default1.jpg',
    ThumbnailMedium: 'http://example.com/thumb_medium1.jpg',
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
    Transcript: 'Transcript for video 2',
    Source: 'Vimeo',
    Duration: 180,
    PublishedAt: new Date().toISOString(),
    Watched: true,
    Archived: false,
    Tags: ['Tag3'],
    CreatedAt: new Date().toISOString(),
    UpdatedAt: new Date().toISOString(),
    Notes: null,
    SubtitleLanguage: null,
    DateAdded: null,
    Views: null,
    Likes: null,
    CommentsCount: null,
    PrivacyStatus: null,
    Resolution: null,
    ThumbnailDefault: null,
    ThumbnailMedium: null,
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
    Transcript: null, Source: null, Duration: 240, PublishedAt: new Date().toISOString(), Watched: false, Archived: false, Tags: null, CreatedAt: new Date().toISOString(), UpdatedAt: new Date().toISOString(), Notes: null, SubtitleLanguage: null, DateAdded: null, Views: null, Likes: null, CommentsCount: null, PrivacyStatus: null, Resolution: null, ThumbnailDefault: null, ThumbnailMedium: null,
  },
];

describe('VideoListPage', () => {
  beforeEach(() => {
    mockedFetchVideos.mockReset();
  });

  it('should render three video items when fetchVideos returns data', async () => {
    mockedFetchVideos.mockResolvedValue(mockVideosData);
    const PageComponent = await VideoListPage();
    render(PageComponent);
    
    expect(screen.getByText('Video Title 1')).toBeInTheDocument();
    expect(screen.getByText('Video Title 2')).toBeInTheDocument();
    expect(screen.getByText('Video Title 3')).toBeInTheDocument();

    expect(screen.getByText('Channel Name 1')).toBeInTheDocument();
    expect(screen.getByText('Channel Name 2')).toBeInTheDocument();
    expect(screen.getByText('Channel Name 3')).toBeInTheDocument();

    expect(screen.getByAltText('Thumbnail for Video Title 1')).toBeInTheDocument();
    expect(screen.getByAltText('Thumbnail for Video Title 2')).toBeInTheDocument();
    expect(screen.getByAltText('Thumbnail for Video Title 3')).toBeInTheDocument();
    
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(3);
  });

  it('should display an error message when fetchVideos fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockedFetchVideos.mockRejectedValue(new Error('Failed to fetch'));
    const PageComponent = await VideoListPage();
    render(PageComponent);
    expect(screen.getByText('Error Fetching Videos')).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
    consoleErrorSpy.mockRestore();
  });

  it('should display a "no videos" message when fetchVideos returns empty array', async () => {
    mockedFetchVideos.mockResolvedValue([]);
    const PageComponent = await VideoListPage();
    render(PageComponent);
    expect(screen.getByText('No Videos Found')).toBeInTheDocument();
    expect(screen.getByText('There are currently no videos to display. Check back later or add some via NocoDB.')).toBeInTheDocument();
  });

  it('should render video items without a channel if channel is null or undefined', async () => {
    const videosWithMissingChannel: NocoDB.Video[] = [
      {
        ...mockVideosData[0],
        Channel: null,
      },
      {
        ...mockVideosData[1],
        Id: 4, 
        VideoID: 'vid4',
        Channel: null,
        ThumbHigh: 'http://example.com/thumb4.jpg',
        Title: 'Video Title 4',
      },
    ];
    mockedFetchVideos.mockResolvedValue(videosWithMissingChannel);
    const PageComponent = await VideoListPage();
    render(PageComponent);

    expect(screen.getByText('Video Title 1')).toBeInTheDocument();
    expect(screen.queryByText('Channel Name 1')).not.toBeInTheDocument();
    expect(screen.getByText('Video Title 4')).toBeInTheDocument();
    expect(screen.queryByText('Channel Name 2')).not.toBeInTheDocument(); 
  });

  it('should render a placeholder if ThumbHigh is null', async () => {
    const videoWithNoThumb: NocoDB.Video[] = [
      {
        ...mockVideosData[0],
        ThumbHigh: null,
      },
    ];
    mockedFetchVideos.mockResolvedValue(videoWithNoThumb);
    const PageComponent = await VideoListPage();
    render(PageComponent);

    expect(screen.getByText('No Thumbnail')).toBeInTheDocument();
    expect(screen.queryByAltText('Thumbnail for Video Title 1')).not.toBeInTheDocument();
  });
});
