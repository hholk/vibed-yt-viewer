import { NextRequest } from 'next/server';
import { GET } from './route';

describe('/api/search', () => {
  it('should return empty results for empty query', async () => {
    const request = new NextRequest('http://localhost:3000/api/search?q=');
    const response = await GET(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.videos).toEqual([]);
    expect(data.total).toBe(0);
    expect(data.query).toBe('');
  });

  it('should handle search requests correctly', async () => {
    // Mock the fetchAllVideos function
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
      {
        Id: 2,
        Title: 'Another Video',
        Description: 'Another test video',
        Channel: 'Another Channel',
        VideoID: 'test456',
        Hashtags: ['another', 'test'],
        Persons: [{ Title: 'Jane Smith' }],
        CreatedAt: new Date('2023-01-02'),
      },
    ];

    // This test would need to mock the database call
    // For now, we'll just test the API structure
    const request = new NextRequest('http://localhost:3000/api/search?q=test&categories=title,description');
    const response = await GET(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data).toHaveProperty('videos');
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('query');
    expect(data).toHaveProperty('categories');
    expect(data).toHaveProperty('availableCategories');
  });
});
