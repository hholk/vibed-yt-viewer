import 'fake-indexeddb/auto';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openOfflineDB, putVideo, getVideoByVideoId, getAllVideos, clearAllVideos, getVideoCount, estimateCacheSize } from './client';
import type { VideoOffline } from '../schemas';

// Clear all IndexedDB databases before each test
beforeEach(async () => {
  const dbs = await indexedDB.databases();
  for (const db of dbs) {
    indexedDB.deleteDatabase(db.name);
  }
  await new Promise(resolve => setTimeout(resolve, 100));
});

afterEach(async () => {
  const dbs = await indexedDB.databases();
  for (const db of dbs) {
    indexedDB.deleteDatabase(db.name);
  }
  await new Promise(resolve => setTimeout(resolve, 100));
});

describe('OfflineDB Client', () => {
  beforeEach(async () => {
    await clearAllVideos();
  });

  afterEach(async () => {
    await clearAllVideos();
  });

  describe('Video CRUD Operations', () => {
    const mockVideo: VideoOffline = {
      Id: 1,
      VideoID: 'abc123',
      Title: 'Test Video',
      URL: 'https://youtube.com/watch?v=abc123',
      PublishedAt: '2024-01-01T00:00:00Z',
      CreatedAt: '2024-01-01T00:00:00Z',
      UpdatedAt: '2024-01-01T00:00:00Z',
      Channel: 'Test Channel',
      Description: 'Test description',
      ThumbHigh: 'https://example.com/thumb.jpg',
    };

    it('should store and retrieve video by Id', async () => {
      await putVideo(mockVideo);
      const retrieved = await openOfflineDB().then(db => db.get('videos', 1));
      
      expect(retrieved).toEqual(mockVideo);
    });

    it('should retrieve video by VideoID', async () => {
      await putVideo(mockVideo);
      const retrieved = await getVideoByVideoId('abc123');
      
      expect(retrieved).toEqual(mockVideo);
    });

    it('should return undefined for non-existent video', async () => {
      const retrieved = await getVideoByVideoId('nonexistent');
      
      expect(retrieved).toBeUndefined();
    });

    it('should store multiple videos', async () => {
      const videos: VideoOffline[] = [
        { ...mockVideo, Id: 1, VideoID: 'abc1' },
        { ...mockVideo, Id: 2, VideoID: 'abc2' },
        { ...mockVideo, Id: 3, VideoID: 'abc3' },
      ];
      
      await clearAllVideos();
      await Promise.all(videos.map(v => putVideo(v)));
      
      const allVideos = await getAllVideos();
      expect(allVideos).toHaveLength(3);
    });

    it('should count videos correctly', async () => {
      await clearAllVideos();
      
      const countBefore = await getVideoCount();
      expect(countBefore).toBe(0);
      
      await putVideo(mockVideo);
      
      const countAfter = await getVideoCount();
      expect(countAfter).toBe(1);
    });

    it('should clear all videos', async () => {
      await putVideo(mockVideo);
      
      expect(await getVideoCount()).toBe(1);
      
      await clearAllVideos();
      
      expect(await getVideoCount()).toBe(0);
    });
  });

  describe('Cache Size Estimation', () => {
    it('should estimate cache size for empty database', async () => {
      await clearAllVideos();
      
      const size = await estimateCacheSize();
      expect(size).toBe(0);
    });

    it('should estimate cache size for populated database', async () => {
      await clearAllVideos();
      
      const mockVideo: VideoOffline = {
        Id: 1,
        VideoID: 'abc123',
        Title: 'Test Video with longer title',
        URL: 'https://youtube.com/watch?v=abc123',
        PublishedAt: '2024-01-01T00:00:00Z',
        CreatedAt: '2024-01-01T00:00:00Z',
        UpdatedAt: '2024-01-01T00:00:00Z',
        Channel: 'Test Channel',
        Description: 'A'.repeat(100), // 100 chars
        ThumbHigh: 'https://example.com/thumb.jpg',
      };
      
      await putVideo(mockVideo);
      
      const size = await estimateCacheSize();
      expect(size).toBeGreaterThan(0);
      expect(size).toBeLessThan(10000); // Should be less than 10KB
    });
  });

  describe('Metadata Operations', () => {
    it('should store and retrieve metadata', async () => {
      const db = await openOfflineDB();
      
      await db.put('metadata', 'test-value', 'test-key');
      
      const retrieved = await db.get('metadata', 'test-key');
      expect(retrieved).toBe('test-value');
    });

    it('should store complex metadata objects', async () => {
      const db = await openOfflineDB();
      
      const metadata = {
        lastSync: 1234567890,
        totalCacheSize: 1024000,
        offlineCachePayloadVersion: 2,
      };
      
      await db.put('metadata', metadata, 'offlineMetadata');
      
      const retrieved = await db.get('metadata', 'offlineMetadata');
      expect(retrieved).toEqual(metadata);
    });
  });

  describe('Pending Mutations', () => {
    it('should store and retrieve pending mutation', async () => {
      const db = await openOfflineDB();
      
      const mutation = {
        id: 'mutation_123',
        type: 'UPDATE' as const,
        videoId: 1,
        timestamp: 1234567890,
        retryCount: 0,
        data: { Title: 'Updated Title' },
      };
      
      await db.add('pendingMutations', mutation);
      
      const retrieved = await db.get('pendingMutations', 'mutation_123');
      expect(retrieved).toEqual(mutation);
    });

    it('should count pending mutations', async () => {
      const db = await openOfflineDB();
      
      expect(await db.count('pendingMutations')).toBe(0);
      
      await db.add('pendingMutations', {
        id: 'mutation_1',
        type: 'UPDATE',
        videoId: 1,
        timestamp: 1234567890,
        retryCount: 0,
      });
      
      expect(await db.count('pendingMutations')).toBe(1);
    });
  });

  describe('Indexes', () => {
    it('should retrieve videos by VideoID index', async () => {
      await clearAllVideos();
      
      const mockVideo: VideoOffline = {
        Id: 1,
        VideoID: 'test-video-id',
        Title: 'Test Video',
        URL: 'https://youtube.com/watch?v=test',
        PublishedAt: '2024-01-01T00:00:00Z',
        CreatedAt: '2024-01-01T00:00:00Z',
        UpdatedAt: '2024-01-01T00:00:00Z',
        Channel: 'Test Channel',
        Description: 'Test',
        ThumbHigh: 'https://example.com/thumb.jpg',
      };
      
      await putVideo(mockVideo);
      
      const retrieved = await getVideoByVideoId('test-video-id');
      expect(retrieved).toEqual(mockVideo);
    });
  });
});
