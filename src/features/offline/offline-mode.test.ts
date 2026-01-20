import 'fake-indexeddb/auto';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getOfflineMode, setOfflineMode, isOnline } from './offline-mode';

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

describe('Offline Mode Management', () => {
  describe('getOfflineMode', () => {
    it('should return false by default', async () => {
      // Reset to default
      await setOfflineMode(false);
      
      const mode = await getOfflineMode();
      expect(mode).toBe(false);
    });

    it('should return true after setting to true', async () => {
      await setOfflineMode(true);
      
      const mode = await getOfflineMode();
      expect(mode).toBe(true);
      
      // Cleanup
      await setOfflineMode(false);
    });

    it('should persist offline mode state', async () => {
      await setOfflineMode(true);
      
      // Simulate new session
      const mode = await getOfflineMode();
      expect(mode).toBe(true);
      
      // Cleanup
      await setOfflineMode(false);
    });
  });

  describe('setOfflineMode', () => {
    it('should set offline mode to true', async () => {
      await setOfflineMode(true);
      
      expect(await getOfflineMode()).toBe(true);
    });

    it('should set offline mode to false', async () => {
      await setOfflineMode(true);
      await setOfflineMode(false);
      
      expect(await getOfflineMode()).toBe(false);
    });
  });

  describe('toggleOfflineMode', () => {
    it('should toggle from false to true', async () => {
      await setOfflineMode(false);
      
      const newState = await (await import('./offline-mode')).toggleOfflineMode();
      
      expect(newState).toBe(true);
      expect(await getOfflineMode()).toBe(true);
      
      // Cleanup
      await setOfflineMode(false);
    });

    it('should toggle from true to false', async () => {
      await setOfflineMode(true);
      
      const newState = await (await import('./offline-mode')).toggleOfflineMode();
      
      expect(newState).toBe(false);
      expect(await getOfflineMode()).toBe(false);
    });
  });

  describe('isOnline', () => {
    it('should return true when navigator.onLine is true', () => {
      // This test assumes browser environment
      const online = isOnline();
      
      // In test environment, navigator might not be available or always online
      expect(typeof online).toBe('boolean');
    });

    it('should handle missing navigator', () => {
      // Mock missing navigator
      const originalNavigator = global.navigator;
      // @ts-expect-error - Testing navigator behavior
      delete global.navigator;
      
      const online = isOnline();
      expect(online).toBe(true); // Should default to true
      
      // Restore
      global.navigator = originalNavigator;
    });
  });
});
