"use client";

import { useOfflineMode } from '@/features/offline/hooks/use-offline-mode';
import { useOfflineStats } from '@/features/offline/hooks/use-offline-stats';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';

export function OfflineIndicator() {
  const { isOfflineMode, isOnline, isSyncing } = useOfflineMode();
  const { pendingMutations } = useOfflineStats();

  // Nur anzeigen wenn Offline-Modus aktiviert ist
  if (!isOfflineMode) return null;

  return (
    <div
      className={`
        sticky top-0 z-50 px-4 py-2 text-sm font-medium
        flex items-center justify-center gap-2
        ${isOnline ? 'bg-blue-600 text-white' : 'bg-yellow-600 text-white'}
      `}
    >
      {isSyncing ? (
        <>
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Syncing...</span>
        </>
      ) : isOnline ? (
        <>
          <Wifi className="w-4 h-4" />
          <span>Offline Mode Active • Online</span>
          {pendingMutations > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
              {pendingMutations} pending
            </span>
          )}
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          <span>Offline Mode • No Connection</span>
          {pendingMutations > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
              {pendingMutations} pending
            </span>
          )}
        </>
      )}
    </div>
  );
}
