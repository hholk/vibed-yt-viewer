import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { beforeEach, afterEach, vi } from 'vitest';
import { SearchComponent } from './search-component';

const mockVideos = [
  {
    Id: 1,
    Title: 'Test Video',
    Description: 'This is a test video',
    Channel: 'Test Channel',
    VideoID: 'test123',
    ThumbHigh: 'test-thumb.jpg',
    Hashtags: ['test', 'video'],
    Persons: [{ Title: 'John Doe' }],
    CreatedAt: new Date('2023-01-01'),
  },
];

describe('SearchComponent', () => {
  it('renders search input', () => {
    render(<SearchComponent initialVideos={mockVideos} />);

    expect(screen.getByPlaceholderText(/Search videos/)).toBeInTheDocument();
  });

  it('shows initial video count', () => {
    render(<SearchComponent initialVideos={mockVideos} />);

    expect(screen.getByText('1 video total')).toBeInTheDocument();
  });

  it('adds search tags when clicking add button', async () => {
    render(<SearchComponent initialVideos={mockVideos} />);

    const input = screen.getByPlaceholderText(/Search videos/);
    await act(async () => {
      fireEvent.change(input, { target: { value: 'machine learning' } });
      fireEvent.focus(input);
    });

    const addButton = await screen.findByText(/Add "machine learning" as tag/);
    await act(async () => {
      fireEvent.click(addButton);
    });

    expect(screen.getByText('📝 machine learning')).toBeInTheDocument();
  });

  it('removes search tags when clicking remove button', async () => {
    render(<SearchComponent initialVideos={mockVideos} />);

    const input = screen.getByPlaceholderText(/Search videos/);
    await act(async () => {
      fireEvent.change(input, { target: { value: 'machine learning' } });
      fireEvent.focus(input);
    });

    const addButton = await screen.findByText(/Add "machine learning" as tag/);
    await act(async () => {
      fireEvent.click(addButton);
    });

    const removeButton = screen.getByLabelText(/Remove .* machine learning tag/);
    await act(async () => {
      fireEvent.click(removeButton);
    });

    expect(screen.queryByText('📝 machine learning')).not.toBeInTheDocument();
  });

  it('clears all tags when clicking clear all', async () => {
    render(<SearchComponent initialVideos={mockVideos} />);

    const input = screen.getByPlaceholderText(/Search videos/);
    await act(async () => {
      fireEvent.change(input, { target: { value: 'machine learning' } });
      fireEvent.focus(input);
    });

    const addButton = await screen.findByText(/Add "machine learning" as tag/);
    await act(async () => {
      fireEvent.click(addButton);
    });

    const clearButton = screen.getByText('Clear all');
    await act(async () => {
      fireEvent.click(clearButton);
    });

    expect(screen.queryByText('📝 machine learning')).not.toBeInTheDocument();
  });
});
const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      success: true,
      videos: mockVideos,
      total: mockVideos.length,
      query: 'machine learning',
      categories: [],
      availableCategories: [],
    }),
  } as Response);

  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
  mockFetch.mockReset();
});
