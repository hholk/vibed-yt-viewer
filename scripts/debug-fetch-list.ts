import 'dotenv/config';

import { fetchVideos } from '../src/features/videos/api/nocodb';

async function main() {
  try {
    const { videos, pageInfo } = await fetchVideos({ limit: 5 });
    console.log('Fetched videos count:', videos.length);
    console.log('Page info:', pageInfo);
    if (videos[0]) {
      console.log('First video sample:', {
        Id: videos[0].Id,
        VideoID: videos[0].VideoID,
        Title: videos[0].Title,
      });
    }
  } catch (error) {
    console.error('Failed to fetch videos:', error);
    process.exitCode = 1;
  }
}

void main();
