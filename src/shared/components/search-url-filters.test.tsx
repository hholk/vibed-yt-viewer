import React from 'react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { videoListItemSchema } from '@/features/videos/api/schemas';
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(window.location.search) }));
vi.mock('@/features/videos/components/video-card', () => ({ VideoCard: ({ video, href }: { video: { Title: string }, href: string }) => <a href={href}>{video.Title}</a> }));
import { SearchComponent } from './search-component';
const videos = [
  videoListItemSchema.parse({ Id: 1, VideoID: 'a', Title: 'Alpha', Channel: '100%' }),
  videoListItemSchema.parse({ Id: 2, VideoID: 'b', Title: 'Beta', Channel: 'Other' }),
];
beforeEach(() => window.history.replaceState(null, '', '/'));
describe('filter list URL ownership', () => {
  it('hydrates a shared link without clearing filters and carries query into details', () => {
    window.history.replaceState(null, '', '/?f=channel:100%25&sort=Title');
    render(<SearchComponent initialVideos={videos} />);
    expect(screen.queryByText('Beta')).toBeNull();
    expect(screen.getByRole('link', { name: 'Alpha' }).getAttribute('href')).toContain('f=channel%3A100%25');
    expect(window.location.search).toContain('f=channel:100%25');
  });
  it('adds and removes filters without losing sort/hash or adding history entries', () => {
    window.history.replaceState(null, '', '/?sort=Title#list');
    const length = window.history.length;
    const view = render(<SearchComponent initialVideos={videos} />);
    fireEvent.change(screen.getByPlaceholderText('Filter loaded videos...'), { target: { value: '100%' } });
    fireEvent.click(screen.getByRole('button', { name: 'channel: 100%' }));
    view.rerender(<SearchComponent initialVideos={videos} />);
    expect(screen.queryByText('Beta')).toBeNull();
    expect(window.location.hash).toBe('#list');
    expect(window.location.search).toContain('sort=Title');
    expect(window.history.length).toBe(length);
    fireEvent.click(screen.getByRole('button', { name: 'Remove 100% filter' }));
    view.rerender(<SearchComponent initialVideos={videos} />);
    expect(screen.getByText('Beta')).toBeTruthy();
    expect(new URLSearchParams(window.location.search).has('f')).toBe(false);
  });
  it('reacts to a history URL snapshot without stale local filter state', () => {
    const view = render(<SearchComponent initialVideos={videos} />);
    window.history.replaceState(null, '', '/?f=channel:Other');
    view.rerender(<SearchComponent initialVideos={videos} />);
    expect(screen.queryByText('Alpha')).toBeNull();
    window.history.replaceState(null, '', '/');
    view.rerender(<SearchComponent initialVideos={videos} />);
    expect(screen.getByText('Alpha')).toBeTruthy();
  });
});
