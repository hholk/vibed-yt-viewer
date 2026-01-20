"use client";

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Trash2, WifiOff, Wifi, Database, Shield, AlertTriangle, Copy, Check } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Switch } from '@/shared/components/ui/switch';
import { useOfflineMode } from '@/features/offline/hooks/use-offline-mode';
import { useOfflineStats } from '@/features/offline/hooks/use-offline-stats';
import { useHoneypotLogs } from '@/features/offline/hooks/use-honeypot-logs';
import { clearAllVideos, setMetadata } from '@/features/offline/db/client';

export function SettingsPageClient() {
  const { isOfflineMode, isOnline, isSyncing, toggleOffline, syncNow } = useOfflineMode();
  const stats = useOfflineStats();
  const honeypot = useHoneypotLogs(100);
  const [isClearing, setIsClearing] = useState(false);
  const [copiedIP, setCopiedIP] = useState<string | null>(null);

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

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIP(label);
      setTimeout(() => setCopiedIP(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleClearHoneypotLogs = async () => {
    const success = await honeypot.clearLogs();
    if (success) {
      alert('Honeypot logs cleared successfully');
    }
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
                  Cache up to 200 videos for offline viewing
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
                  When enabled, the app caches the 200 newest videos (without transcripts) for offline access.
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
                <span className="font-medium">{stats.cachedVideos} / 200</span>
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

        {/* Security / Honeypot Logs */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-orange-500" />
                <h2 className="text-xl font-semibold">Scanner Detection</h2>
              </div>
              <Button
                onClick={handleClearHoneypotLogs}
                disabled={honeypot.summary.total === 0}
                variant="outline"
                size="sm"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear
              </Button>
            </div>

            {honeypot.loading ? (
              <p className="text-sm text-muted-foreground">Loading scanner logs...</p>
            ) : honeypot.error ? (
              <p className="text-sm text-red-500">Error loading logs: {honeypot.error}</p>
            ) : honeypot.summary.total === 0 ? (
              <p className="text-sm text-muted-foreground">No scanner activity detected yet.</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">{honeypot.summary.total}</p>
                    <p className="text-xs text-muted-foreground">Total Attempts</p>
                  </div>
                  <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">{honeypot.summary.uniqueIPs}</p>
                    <p className="text-xs text-muted-foreground">Unique IPs</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{honeypot.summary.topPaths[0]?.count || 0}</p>
                    <p className="text-xs text-muted-foreground">Most Hit Path</p>
                  </div>
                </div>

                {honeypot.summary.topIPs.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      Top Scanner IPs
                    </h3>
                    <div className="space-y-2">
                      {honeypot.summary.topIPs.slice(0, 5).map(({ ip, count }) => (
                        <div
                          key={ip}
                          className="flex items-center justify-between p-2 bg-background border rounded-md text-sm group hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <code className="text-xs font-mono truncate">{ip}</code>
                            <span className="text-xs text-muted-foreground">({count}x)</span>
                          </div>
                          <Button
                            onClick={() => copyToClipboard(ip, ip)}
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            {copiedIP === ip ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {honeypot.summary.topPaths.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium mb-2">Most Targeted Paths</h3>
                    <div className="flex flex-wrap gap-2">
                      {honeypot.summary.topPaths.slice(0, 8).map(({ path, count }) => (
                        <span
                          key={path}
                          className="px-2 py-1 bg-muted rounded-md text-xs font-mono"
                        >
                          {path} ({count})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <details className="mt-4">
                  <summary className="text-sm font-medium cursor-pointer hover:text-muted-foreground">
                    View all logs ({honeypot.logs.length})
                  </summary>
                  <div className="mt-3 max-h-64 overflow-y-auto space-y-2">
                    {honeypot.logs.map((log) => (
                      <div
                        key={log.id}
                        className="p-2 bg-muted/30 rounded-md text-xs font-mono"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium">{log.ip}</span>
                          <span className="text-muted-foreground">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-muted-foreground truncate">
                          {log.method} {log.path}
                        </div>
                        <div className="text-muted-foreground truncate text-[10px]">
                          {log.userAgent.slice(0, 80)}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              </>
            )}
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
