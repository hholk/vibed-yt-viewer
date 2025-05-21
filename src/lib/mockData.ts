import { Video } from './nocodb';

const now = new Date();

export const mockVideos: Video[] = [
  {
    Id: 1,
    VideoID: 'dQw4w9WgXcQ',
    Title: 'Sample Video 1',
    Channel: 'Sample Channel',
    ThumbHigh: 'https://via.placeholder.com/480x360',
    URL: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    Transcript: 'This is a sample transcript for video 1.',
    Description: 'This is a sample video description 1.',
    Duration: 330, // in seconds
    PublishedAt: now,
    ViewCount: 1000,
    LikeCount: 100,
    CommentCount: 10,
    Rating: 4.5,
    PersonalNotes: 'This is a sample note for video 1.',
    Tags: [{ Id: 1, Title: 'sample' }, { Id: 2, Title: 'video' }, { Id: 3, Title: 'test' }],
    KeyExamples: ['Example 1', 'Example 2'],
    KeyNumbersData: JSON.stringify({ key: 'value' }),
    // Add other required fields with appropriate types
    CreatedAt: now,
    UpdatedAt: now,
    // Add any other required fields with default values
  } as unknown as Video,
  {
    Id: 2,
    VideoID: '9bZkp7q19f0',
    Title: 'Sample Video 2',
    Channel: 'Another Channel',
    ThumbHigh: 'https://via.placeholder.com/480x360',
    URL: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
    Transcript: 'This is a sample transcript for video 2.',
    Description: 'This is a sample video description 2.',
    Duration: 225, // in seconds
    PublishedAt: now,
    ViewCount: 2000,
    LikeCount: 200,
    CommentCount: 20,
    Rating: 4.0,
    PersonalNotes: 'This is a sample note for video 2.',
    Tags: [{ Id: 1, Title: 'sample' }, { Id: 2, Title: 'test' }, { Id: 3, Title: 'demo' }],
    KeyExamples: ['Example 3', 'Example 4'],
    KeyNumbersData: JSON.stringify({ key: 'value2' }),
    // Add other required fields with appropriate types
    CreatedAt: now,
    UpdatedAt: now,
    // Add any other required fields with default values
  } as unknown as Video
];