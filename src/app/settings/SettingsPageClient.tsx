"use client";

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Trash2, WifiOff, Wifi, Database } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Switch } from '@/shared/components/ui/switch';
import { useOfflineMode } from '@/features/offline/hooks/use-offline-mode';
import { useOfflineStats } from '@/features/offline/hooks/use-offline-stats';
import { clearAllVideos, setMetadata } from '@/features/offline/db/client';

export function SettingsPageClient() {
  const { isOfflineMode, isOnline, isSyncing, toggleOffline, syncNow } = useOfflineMode();
  const stats = useOfflineStats();
  const [isClearing, setIsClearing] = useState(false);

  const handleClearCache = async () => {
    if (!confirm('Are you sure you want to clear the offline cache? This will remove all cached videos.')) {
      return;
    }

    setIsClearing(true);
    try {
      // Clear cache directly using IndexedDB client (client-safe)
      await clearAllVideos();
      await setMetadata('lastSync', null);
      await setMetadata('totalCacheSize', 0);
      stats.refresh();
      alert('Cache cleared successfully');
    } catch (error) {
      console.error('Failed to clear cache:', error);
      alert('Failed to clear cache');
    } finally {
      setIsClearing(false);
    }
  };

  const handleSync = async () => {
    try {
      const result = await syncNow();
      stats.refresh();

      // Check if sync completed but no videos loaded
      if (result.videosUpdated === 0) {
        const message = [
          '⚠️ Sync completed but no videos cached',
          '',
          'Possible reasons:',
          '- Connection too slow (timeout)',
          '- No videos in database',
          '- Check browser console for details',
          '',
          result.mutationsSynced ? `Changes synced: ${result.mutationsSynced}` : '',
        ]
          .filter(Boolean)
          .join('\n');
        alert(message);
        return;
      }

      // Show detailed sync result
      const message = [
        '✅ Sync completed successfully!',
        `Videos cached: ${result.videosUpdated}`,
        result.mutationsSynced ? `Changes synced: ${result.mutationsSynced}` : '',
        result.errors?.length ? `Errors: ${result.errors.length}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      alert(message);
    } catch (error) {
      console.error('Sync failed:', error);
      // Error already shown by syncNow
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>

        {/* Connection Status */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              {isOnline ? (
                <>
                  <Wifi className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-medium">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-5 h-5 text-red-500" />
                  <span className="text-sm font-medium">Offline</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Offline Mode */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold mb-1">Offline Mode</h2>
                <p className="text-sm text-muted-foreground">
                  Cache up to 2000 videos for offline viewing
                </p>
              </div>
              <Switch
                checked={isOfflineMode}
                onCheckedChange={toggleOffline}
              />
            </div>

            {isOfflineMode && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-4">
                  When enabled, the app caches the 2000 newest videos (without transcripts) for offline access.
                  You can still use the app when offline.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cache Stats */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-5 h-5" />
              <h2 className="text-xl font-semibold">Cache Statistics</h2>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Cached Videos</span>
                <span className="font-medium">{stats.cachedVideos} / 2000</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Cache Size</span>
                <span className="font-medium">{stats.cacheSizeMB} MB / 40 MB</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Last Sync</span>
                <span className="font-medium text-sm">{formatDate(stats.lastSync)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Pending Changes</span>
                <span className="font-medium">
                  {stats.pendingMutations}
                  {stats.pendingMutations > 0 && (
                    <span className="ml-2 text-xs text-yellow-600">
                      (will sync when online)
                    </span>
                  )}
                </span>
              </div>

              {/* Progress bar */}
              <div className="pt-2">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min((stats.cacheSizeMB / 40) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {((stats.cacheSizeMB / 40) * 100).toFixed(1)}% of storage limit
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Actions</h2>

            <div className="space-y-3">
              <Button
                onClick={handleSync}
                disabled={isSyncing || !isOnline}
                className="w-full"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </Button>

              <Button
                onClick={handleClearCache}
                disabled={isClearing || stats.cachedVideos === 0}
                variant="destructive"
                className="w-full"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {isClearing ? 'Clearing...' : 'Clear Cache'}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              Sync downloads the latest videos and uploads any changes made offline.
              Clearing the cache removes all offline videos but keeps your online data safe.
            </p>
          </CardContent>
        </Card>

        {/* Info */}
        <div className="mt-6 text-center text-xs text-muted-foreground">
          <p>Offline mode caches videos without transcripts to save space.</p>
          <p className="mt-1">Maximum cache size: 40 MB</p>
        </div>
      </div>
    </div>
  );
}
