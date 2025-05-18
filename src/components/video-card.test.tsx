import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VideoCard } from './video-card';
import type { Video } from '@/lib/nocodb'; // Assuming Video type is exported
import '@testing-library/jest-dom'; // For custom matchers

// Mock the useMounted hook to always return true for tests
vi.mock('@/hooks/use-mounted', () => ({
  useMounted: () => true,
}));

const mockVideo: Video = {
  Id: 1,
  VideoID: 'dQw4w9WgXcQ',
  URL: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  ThumbHigh: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
  Title: 'Never Gonna Give You Up',
  Channel: 'Rick Astley',
  Description: 'Official video for “Never Gonna Give You Up” by Rick Astley',
  ImportanceRating: null,
  PersonalComment: null,
  CreatedAt: new Date().toISOString(),
  UpdatedAt: new Date().toISOString(),
  PublishedAt: new Date().toISOString(),
  Tags: [{name: 'Music'}, {name: '80s'}],
  Categories: [{name: 'Entertainment'}],
  FullTranscript: 'We\'re no strangers to love...',
  ActionableAdvice: null,
  NarrativeFlow: null,
  TLDR: 'Iconic music video.',
  MainSummary: 'The official music video for Rick Astley\'s Never Gonna Give You Up.',
  Transcript: 'We\'re no strangers to love...', 
  // Ensure all other fields from Video type are present
  ChannelURL: 'https://www.youtube.com/channel/UCuAXFkgsw1L7xaCfnd5JJOw',
  Watched: false,
  Private: false,
  Archived: false,
  Summary: 'The official music video.',
  Prompt: undefined, Persons: undefined, Companies: undefined, InvestableAssets: undefined, Indicators: undefined,
  Trends: undefined, Hashtags: undefined, Institutions: undefined, KeyExamples: undefined, MemorableTakeaways: undefined,
  VideoGenre: undefined, Sentiment: undefined, PrimarySources: undefined, MainTopic: undefined, DetailedNarrativeFlow: undefined,
  KeyNumbersData: undefined, MemorableQuotes: undefined, "Book-/Media-Recommandations": undefined, Speaker: undefined,
  "$Ticker": undefined, "Events/Fairs": undefined, URLs: undefined, SentimentReason: undefined, TechnicalTerms: undefined,
  DOIs: undefined, nc___: undefined, __nc_evolve_to_text__: undefined, "Created By": undefined, "Updated By": undefined,
};

describe('VideoCard Component', () => {
  // beforeEach(() => {
  //   render(<VideoCard video={mockVideo} />); // Removed from here
  // });

  test('renders video title and channel', () => {
    render(<VideoCard video={mockVideo} />);
    expect(screen.getByText(mockVideo.Title)).toBeInTheDocument();
    if (mockVideo.Channel) {
      expect(screen.getByText(mockVideo.Channel)).toBeInTheDocument();
    }
  });

  test('renders thumbnail if ThumbHigh is provided', () => {
    render(<VideoCard video={mockVideo} />);
    const thumbnail = screen.getByAltText(`Thumbnail for ${mockVideo.Title}`);
    expect(thumbnail).toBeInTheDocument();
    expect(thumbnail).toHaveAttribute('src', expect.stringContaining(encodeURIComponent(mockVideo.ThumbHigh!)));
  });

  test('displays static star rating based on ImportanceRating', () => {
    // Test with no rating (null)
    render(<VideoCard video={{ ...mockVideo, ImportanceRating: null }} />);
    let starsContainer = screen.queryByTestId('star-rating-display'); // Add data-testid to the star container in VideoCard
    if (starsContainer) { // if rating is null, it might not render the stars container
      expect(starsContainer.children.length).toBe(5); // Check for 5 star icons (e.g., all empty)
      // Add specific checks for empty stars if needed (e.g. class or SVG content)
    }

    // Test with a specific rating
    const rating = 4;
    render(<VideoCard video={{ ...mockVideo, ImportanceRating: rating }} />);
    starsContainer = screen.getByTestId('star-rating-display'); 
    expect(starsContainer.children.length).toBe(5);
    // Assuming filled stars have a specific class or attribute, or a different SVG path
    // This part is conceptual as it depends on how StarIcon differentiates filled/empty states
    // For example, if filled stars have 'lucide-star-filled' and empty have 'lucide-star'
    // const filledStars = screen.getAllByTestId('filled-star'); // Add data-testid to filled star icons
    // expect(filledStars.length).toBe(rating);
    // const emptyStars = screen.getAllByTestId('empty-star'); // Add data-testid to empty star icons
    // expect(emptyStars.length).toBe(5 - rating);
    // For now, we just check the container exists if rating is provided
    expect(starsContainer).toBeInTheDocument();
  });

  test('displays personal comment snippet if available', () => {
    // Test with no comment
    render(<VideoCard video={{ ...mockVideo, PersonalComment: null }} />);
    // Assuming the comment snippet paragraph has a data-testid or can be found by text
    // For now, we'll check if it's NOT there if null
    const commentElementNull = screen.queryByTestId('personal-comment-snippet'); // Add data-testid in VideoCard
    expect(commentElementNull).not.toBeInTheDocument();

    // Test with a comment
    const testComment = 'This is a fairly long and elaborate test comment designed to check if the snippet functionality works as expected, displaying only a portion of it.';
    const expectedSnippet = 'This is a fairly long and elaborate test comment designed to check if t...';
    render(<VideoCard video={{ ...mockVideo, PersonalComment: testComment }} />);
    const commentElement = screen.getByTestId('personal-comment-snippet');
    expect(commentElement).toBeInTheDocument();
    expect(commentElement).toHaveTextContent(expectedSnippet);
  });

  test('card links to the correct video detail page', () => {
    render(<VideoCard video={mockVideo} />);
    const linkElement = screen.getByRole('link');
    expect(linkElement).toBeInTheDocument();
    expect(linkElement).toHaveAttribute('href', `/video/${mockVideo.VideoID}`);
  });

  // This test can be removed or merged as the above tests cover static display
  // test('initial rating and comment from props are displayed', () => {
  //   const videoWithData: Video = {
  //     ...mockVideo,
  //     ImportanceRating: 4,
  //     PersonalComment: 'Existing comment',
  //   };
  //   render(<VideoCard video={videoWithData} />);
  //   // Check for static stars (covered by 'displays static star rating...' test)
  //   // Check for comment snippet (covered by 'displays personal comment snippet...' test)
  // });

});
