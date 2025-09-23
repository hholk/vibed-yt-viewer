import { render, screen, fireEvent } from '@testing-library/react';
import { SearchComponent } from './search-component';

const mockVideos = [
  {
    Id: 1,
    Title: 'Test Video',
    Description: 'This is a test video',
    Channel: 'Test Channel',
    VideoID: 'test123',
    Hashtags: ['test', 'video'],
    Persons: [{ Title: 'John Doe' }],
    CreatedAt: new Date('2023-01-01'),
  },
];

describe('SearchComponent', () => {
  it('renders search input', () => {
    render(<SearchComponent initialVideos={mockVideos} />);

    expect(screen.getByPlaceholderText('Search videos... (e.g., \'machine learning\', \'John Doe\', \'#ai\')')).toBeInTheDocument();
  });

  it('shows initial video count', () => {
    render(<SearchComponent initialVideos={mockVideos} />);

    expect(screen.getByText('1 video found')).toBeInTheDocument();
  });

  it('adds search tags when clicking add button', async () => {
    render(<SearchComponent initialVideos={mockVideos} />);

    const input = screen.getByPlaceholderText('Search videos... (e.g., \'machine learning\', \'John Doe\', \'#ai\')');
    fireEvent.change(input, { target: { value: 'machine learning' } });

    // Click the add button (this would appear after typing)
    const addButton = screen.getByText('Add "machine learning" as tag');
    fireEvent.click(addButton);

    expect(screen.getByText('📝 machine learning')).toBeInTheDocument();
  });

  it('removes search tags when clicking remove button', async () => {
    render(<SearchComponent initialVideos={mockVideos} />);

    const input = screen.getByPlaceholderText('Search videos... (e.g., \'machine learning\', \'John Doe\', \'#ai\')');
    fireEvent.change(input, { target: { value: 'machine learning' } });

    const addButton = screen.getByText('Add "machine learning" as tag');
    fireEvent.click(addButton);

    const tag = screen.getByText('📝 machine learning');
    const removeButton = tag.querySelector('button');
    fireEvent.click(removeButton!);

    expect(screen.queryByText('📝 machine learning')).not.toBeInTheDocument();
  });

  it('clears all tags when clicking clear all', async () => {
    render(<SearchComponent initialVideos={mockVideos} />);

    const input = screen.getByPlaceholderText('Search videos... (e.g., \'machine learning\', \'John Doe\', \'#ai\')');
    fireEvent.change(input, { target: { value: 'machine learning' } });

    const addButton = screen.getByText('Add "machine learning" as tag');
    fireEvent.click(addButton);

    const clearButton = screen.getByText('Clear all');
    fireEvent.click(clearButton);

    expect(screen.queryByText('📝 machine learning')).not.toBeInTheDocument();
  });
});
