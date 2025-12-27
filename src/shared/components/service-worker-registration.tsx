"use client";

import { useEffect } from 'react';

const DEV_SW_FLAG_KEY = 'ytViewerEnableDevSW';

/**
 * Service Worker Registration Component
 *
 * Registers the Service Worker on mount to enable PWA offline functionality.
 * Must be a client component to access navigator.serviceWorker API.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const isProd = process.env.NODE_ENV === 'production';
    const enableDevSW =
      window.localStorage.getItem(DEV_SW_FLAG_KEY) === 'true' ||
      new URLSearchParams(window.location.search).get('sw') === '1' ||
      process.env.NEXT_PUBLIC_ENABLE_SW_DEV === 'true';

    if (!isProd && !enableDevSW) {
      // In development, a Service Worker can easily cause chunk/cache mismatches.
      // If dev SW is not explicitly enabled, unregister any existing SW and clear our caches.
      navigator.serviceWorker
        .getRegistrations()
        .then(async (registrations) => {
          await Promise.all(registrations.map((reg) => reg.unregister()));
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames
              .filter((name) => name.startsWith('yt-viewer-'))
              .map((name) => caches.delete(name)),
          );
          console.log('[SW] Dev mode: unregistered Service Worker and cleared caches');
        })
        .catch((error) => {
          console.warn('[SW] Dev mode: failed to unregister/clear caches:', error);
        });
      return;
    }

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[SW] Service Worker registered successfully:', registration.scope);

        // Check for updates periodically (every hour)
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      })
      .catch((error) => {
        console.error('[SW] Service Worker registration failed:', error);
      });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SW] Service Worker controller changed - new version active');
    });
  }, []);

  return null; // This component doesn't render anything
}
