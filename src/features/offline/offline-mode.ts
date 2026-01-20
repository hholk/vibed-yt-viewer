import { getMetadata, setMetadata } from './db/client';

/**
 * Offline Mode Flag Management
 *
 * Flag wird in IndexedDB gespeichert (nicht localStorage),
 * damit Service Worker darauf zugreifen kann.
 */

const OFFLINE_MODE_KEY = 'offlineModeEnabled';

/**
 * Get current offline mode status
 */
export async function getOfflineMode(): Promise<boolean> {
  try {
    const enabled = await getMetadata<boolean>(OFFLINE_MODE_KEY);
    return enabled ?? false;
  } catch (error) {
    console.error('[OfflineMode] Error getting offline mode:', error);
    return false;
  }
}

/**
 * Set offline mode status
 *
 * Note: Cache sync wird vom Hook aufgerufen (use-offline-mode.ts)
 */
export async function setOfflineMode(enabled: boolean): Promise<void> {
  try {
    await setMetadata(OFFLINE_MODE_KEY, enabled);
    console.log(`[OfflineMode] Set to ${enabled}`);
  } catch (error) {
    console.error('[OfflineMode] Error setting offline mode:', error);
    throw error;
  }
}

/**
 * Toggle offline mode on/off
 *
 * @returns new state
 */
export async function toggleOfflineMode(): Promise<boolean> {
  const current = await getOfflineMode();
  const newState = !current;
  await setOfflineMode(newState);
  return newState;
}

/**
 * Check if browser is currently online
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}
