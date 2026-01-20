'use client';

import { useEffect } from 'react';

/**
 * Service Worker Registration Component
 *
 * Registers the Service Worker on mount to enable PWA offline functionality.
 * Must be a client component to access navigator.serviceWorker API.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    if (!window.isSecureContext) {
      console.warn(
        '[SW] Service Worker not registered: insecure context (use https or localhost).',
      );
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const disableSW = params.get('sw') === '0';
    if (disableSW) {
      console.log('[SW] Service Worker disabled via ?sw=0');
      return;
    }

    let updateIntervalId: number | undefined;
    const controllerChangeHandler = () => {
      console.log('[SW] Service Worker controller changed - new version active');
    };

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[SW] Service Worker registered successfully:', registration.scope);

        // Check for updates periodically (every hour)
        updateIntervalId = window.setInterval(() => {
          registration.update().catch((error) => {
            console.warn('[SW] Service Worker update failed:', error);
          });
        }, 60 * 60 * 1000);
      })
      .catch((error) => {
        console.error('[SW] Service Worker registration failed:', error);
      });

    navigator.serviceWorker.addEventListener('controllerchange', controllerChangeHandler);

    return () => {
      if (updateIntervalId) window.clearInterval(updateIntervalId);
      navigator.serviceWorker.removeEventListener('controllerchange', controllerChangeHandler);
    };
  }, []);

  return null; // This component doesn't render anything
}
