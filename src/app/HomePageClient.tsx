"use client";

import Link from 'next/link';
import { useState } from 'react';
import { Settings } from 'lucide-react';
import { SearchComponent } from '@/shared/components/search-component';
import { PWAInstallPrompt } from '@/shared/components/pwa-install-prompt';
import { Button } from '@/shared/components/ui/button';
import { SavedPlaylistClient } from '@/features/saved/components/SavedPlaylistClient';

/**
 * Client-side HomePage Component
 *
 * This component renders entirely on the client to ensure offline functionality works.
 * The SearchComponent handles all data fetching client-side, which allows the Service Worker
 * to intercept /api/videos requests and serve data from IndexedDB when offline.
 */
export function HomePageClient() {
  const [activeView, setActiveView] = useState<'summaries' | 'saved'>('summaries');

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-50 p-4 md:p-8 font-plex-sans">
      <div className="container mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap justify-between items-center gap-4">
          <h1 className="text-3xl font-semibold text-neutral-100 break-words hyphens-auto" title="Video Collection">
            Video Collection
          </h1>
          <div className="flex items-center gap-4">
            <Link
              href="/settings"
              className="p-2 rounded-lg hover:bg-neutral-800 transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5 text-neutral-400 hover:text-neutral-100" />
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Button
            type="button"
            variant={activeView === 'summaries' ? 'default' : 'secondary'}
            onClick={() => setActiveView('summaries')}
          >
            Summaries
          </Button>
          <Button
            type="button"
            variant={activeView === 'saved' ? 'default' : 'secondary'}
            onClick={() => setActiveView('saved')}
          >
            Saved
          </Button>
        </div>

        {activeView === 'summaries' ? (
          <div className="search-component-wrapper">
            {/* No initialVideos - let SearchComponent fetch client-side */}
            <SearchComponent initialVideos={[]} />
          </div>
        ) : (
          <SavedPlaylistClient />
        )}

        {/* PWA Install Prompt */}
        <PWAInstallPrompt />
      </div>
    </div>
  );
}
