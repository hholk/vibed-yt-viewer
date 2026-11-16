import React from 'react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(window.location.search) }));
vi.mock('./VideoDetailPageContent', () => ({ VideoDetailPageContent: ({ video, previousVideo, nextVideo }: { video: { Title: string }; previousVideo: unknown; nextVideo: unknown }) => <div>{video.Title}<span data-testid="nav">{JSON.stringify([previousVideo, nextVideo])}</span></div> }));
import VideoDetailPageClient from './VideoDetailPageClient';
const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});
function view() {
  return <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}><VideoDetailPageClient videoId="a" allVideos={[]} /></SWRConfig>;
}
describe('detail URL and offline contract', () => {
  it('sends encoded filters, sort and required videoId; query changes invalidate SWR', async () => {
    window.history.replaceState(null, '', '/video/a?f=channel:100%25&sort=Title');
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true, video: { Title: 'Loaded' }, previousVideo: null, nextVideo: null }) });
    const rendered = render(view());
    await screen.findByText('Loaded');
    const first = new URL(fetchMock.mock.calls[0][0], 'http://localhost');
    expect(first.searchParams.get('f')).toBe('channel:100%');
    expect(first.searchParams.get('sort')).toBe('Title');
    expect(first.searchParams.get('videoId')).toBe('a');
    window.history.replaceState(null, '', '/video/a?f=channel:Other&sort=-Title');
    rendered.rerender(view());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(new URL(fetchMock.mock.calls[1][0], 'http://localhost').searchParams.get('f')).toBe('channel:Other');
  });
  it('renders the existing Service Worker offline payload without inventing navigation', async () => {
    window.history.replaceState(null, '', '/video/offline-id?f=channel:100%25');
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true, video: { Title: 'Offline cached video' }, previousVideo: null, nextVideo: null, offline: true }) });
    render(view());
    await screen.findByText('Offline cached video');
    expect(screen.getByTestId('nav').textContent).toBe('[null,null]');
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => new URL(url, 'http://localhost').searchParams.get('videoId') === 'offline-id')).toBe(true));
  });
});
