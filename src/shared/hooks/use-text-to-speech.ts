'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

// Use a same-origin proxy to avoid browser CORS/mixed-content issues.
const TTS_PROXY_PATH = '/api/tts';

const MAX_CHUNK_LENGTH = 600; // Characters per chunk for optimal TTS
const FETCH_TIMEOUT_MS = 60_000;
const FIRST_SEGMENT_FETCH_TIMEOUT_MS = 120_000;

// Keep a small rolling buffer so the next audio is usually ready when the current finishes.
const PREFETCH_AHEAD = 2;

// Default voices (best-effort): many CosyVoice deployments accept a voice/speaker id.
// If your server uses a different parameter name, wire it up in the proxy or here.
const DEFAULT_VOICE_DE = (process.env.NEXT_PUBLIC_TTS_VOICE_DE as string | undefined) || 'de';
const DEFAULT_VOICE_EN = (process.env.NEXT_PUBLIC_TTS_VOICE_EN as string | undefined) || 'en';

export type TTSStatus = 'idle' | 'preparing' | 'playing' | 'paused' | 'error';

interface TTSSegment {
  text: string;
  language: string;
}

interface UseTextToSpeechOptions {
  defaultLanguage?: 'de' | 'en';
  speed?: number;
}

interface UseTextToSpeechReturn {
  status: TTSStatus;
  isPlaying: boolean;
  isPreparing: boolean;
  currentSegmentIndex: number;
  totalSegments: number;
  error: string | null;
  play: (segments: TTSSegment[]) => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
}

/**
 * Split text into chunks.
 *
 * For TTS latency/reliability, shorter chunks typically behave better than large 600-char blocks.
 * Here we primarily split by sentence count (2 sentences per chunk), with a max char safeguard.
 */
function splitIntoChunks(
  text: string,
  maxLength: number = MAX_CHUNK_LENGTH,
  sentencesPerChunk: number = 2,
): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];

  // Sentence-ish split (good enough for UI text)
  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);

  const chunks: string[] = [];
  let current: string[] = [];

  const flush = () => {
    const chunk = current.join(' ').trim();
    if (chunk) chunks.push(chunk);
    current = [];
  };

  for (const sentence of sentences) {
    current.push(sentence);

    const candidate = current.join(' ');
    const reachedSentenceLimit = current.length >= sentencesPerChunk;
    const reachedCharLimit = candidate.length >= maxLength;

    if (reachedSentenceLimit || reachedCharLimit) {
      flush();
    }
  }

  flush();

  // Hard safety: if any chunk is still too long (rare), force split.
  const finalChunks: string[] = [];
  for (const c of chunks) {
    if (c.length <= maxLength) {
      finalChunks.push(c);
    } else {
      for (let i = 0; i < c.length; i += maxLength) {
        finalChunks.push(c.slice(i, i + maxLength).trim());
      }
    }
  }

  return finalChunks.filter(c => c.length > 0);
}

/**
 * Strip markdown formatting from text
 */
function stripMarkdown(text: string): string {
  return text
    // Remove headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove images
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}$/gm, '')
    // Remove blockquotes marker
    .replace(/^>\s*/gm, '')
    // Remove list markers
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // Clean up extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Custom hook for text-to-speech functionality using CosyVoice API
 */
export function useTextToSpeech(options: UseTextToSpeechOptions = {}): UseTextToSpeechReturn {
  // Many TTS engines interpret speed as a multiplier (1.0 = normal). 70% faster => 1.7.
  // If your backend uses a different scale, adjust or expose via UI.
  const { speed = 1.7 } = options;

  const [status, setStatus] = useState<TTSStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [totalSegments, setTotalSegments] = useState(0);

  // Reuse a single <audio> element to reduce allocations and event handler churn.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isStoppedRef = useRef(false);
  const isPausedRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      // Lazy creation: do not touch Audio() until user actually presses "Read Aloud".
      audioRef.current = new Audio();
      audioRef.current.preload = 'auto';
    }
    return audioRef.current;
  }, []);

  const getVoiceForLanguage = useCallback((language: string) => {
    return language?.toLowerCase().startsWith('de') ? DEFAULT_VOICE_DE : DEFAULT_VOICE_EN;
  }, []);

  /**
   * Fetch audio from TTS API (with timeout)
   */
  const fetchAudio = useCallback(
    async (text: string, language: string, timeoutMs: number = FETCH_TIMEOUT_MS): Promise<Blob | null> => {
      const parentAbort = abortControllerRef.current;
      const controller = new AbortController();

      const onAbort = () => {
        try {
          controller.abort();
        } catch {
          // ignore
        }
      };

      const timeoutId = setTimeout(onAbort, timeoutMs);
      parentAbort?.signal.addEventListener('abort', onAbort, { once: true });

      try {
        const voice = getVoiceForLanguage(language);

        const response = await fetch(TTS_PROXY_PATH, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: stripMarkdown(text),
            language,
            speed,
            // Best-effort voice selection. Your proxy/upstream may ignore this.
            voice,
            speaker: voice,
            use_cache: true,
          }),
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!response.ok) {
          const maybeText = await response.text().catch(() => '');
          throw new Error(`TTS API error: ${response.status}${maybeText ? ` - ${maybeText}` : ''}`);
        }

        return await response.blob();
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return null;
        }
        if (err instanceof TypeError && /fetch/i.test(err.message)) {
          throw new Error('Failed to fetch TTS audio.');
        }
        throw err;
      } finally {
        clearTimeout(timeoutId);
        parentAbort?.signal.removeEventListener('abort', onAbort);
      }
    },
    [speed, getVoiceForLanguage],
  );

  /**
   * Best-effort: ask server to prepare/cache all chunks upfront.
   * This reduces perceived latency while playing sequentially.
   */
  const prefetchChunks = useCallback(
    async (chunks: { text: string; language: string }[]) => {
      try {
        // Go through same-origin proxy as well.
        await fetch('/api/tts/prepare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            segments: chunks.map(c => {
              const voice = getVoiceForLanguage(c.language);
              return {
                text: stripMarkdown(c.text),
                language: c.language,
                speed,
                voice,
                speaker: voice,
              };
            }),
          }),
          signal: abortControllerRef.current?.signal,
        });
      } catch {
        // ignore prefetch failures
      }
    },
    [speed, getVoiceForLanguage],
  );

  /**
   * Play a single audio blob (reusing a single Audio element)
   */
  const playAudioBlob = useCallback(async (blob: Blob): Promise<void> => {
    const audio = ensureAudio();
    const url = URL.createObjectURL(blob);

    return new Promise((resolve, reject) => {
      const cleanup = () => {
        URL.revokeObjectURL(url);
        audio.onended = null;
        audio.onerror = null;
      };

      audio.onended = () => {
        cleanup();
        resolve();
      };

      audio.onerror = () => {
        cleanup();
        reject(new Error('Audio playback failed'));
      };

      audio.src = url;
      audio.play().catch(err => {
        cleanup();
        reject(err);
      });
    });
  }, [ensureAudio]);

  /**
   * Main play function - takes segments and plays them in sequence
   */
  const play = useCallback(
    async (segments: TTSSegment[]) => {
      // Reset state
      isStoppedRef.current = false;
      isPausedRef.current = false;
      setError(null);
      setCurrentSegmentIndex(0);

      // Ensure Audio exists only when playback is requested (prevents any audio init work on page load)
      ensureAudio();

      // Create abort controller for fetch cancellation
      abortControllerRef.current = new AbortController();

      // Process segments into chunks
      const allChunks: { text: string; language: string }[] = [];
      for (const segment of segments) {
        const chunks = splitIntoChunks(segment.text);
        for (const chunk of chunks) {
          allChunks.push({ text: chunk, language: segment.language });
        }
      }

      setTotalSegments(allChunks.length);

      if (allChunks.length === 0) {
        setError('No text to read');
        setStatus('error');
        return;
      }

      setStatus('preparing');

      try {
        // Prefetch in background (don't block playback)
        void prefetchChunks(allChunks);

        // Rolling buffer of at most PREFETCH_AHEAD in-flight fetches.
        const inFlight = new Map<number, Promise<Blob | null>>();

        const schedule = (idx: number) => {
          if (idx < 0 || idx >= allChunks.length) return;
          if (inFlight.has(idx)) return;
          const chunk = allChunks[idx];
          const timeoutMs = idx === 0 ? FIRST_SEGMENT_FETCH_TIMEOUT_MS : FETCH_TIMEOUT_MS;
          inFlight.set(idx, fetchAudio(chunk.text, chunk.language, timeoutMs));
        };

        // 1) Verify first segment is ready before starting playback
        setStatus('preparing');
        schedule(0);
        const firstBlob = await inFlight.get(0)!;
        inFlight.delete(0);

        if (!firstBlob || isStoppedRef.current) return;

        // 2) Once first audio is ready, start generating ahead for gapless playback
        for (let k = 1; k <= PREFETCH_AHEAD; k++) schedule(k);

        setCurrentSegmentIndex(0);
        setStatus('playing');
        await playAudioBlob(firstBlob);

        // 3) Continue with remaining segments, keeping PREFETCH_AHEAD prepared
        for (let i = 1; i < allChunks.length; i++) {
          if (isStoppedRef.current) break;

          while (isPausedRef.current && !isStoppedRef.current) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          if (isStoppedRef.current) break;

          setCurrentSegmentIndex(i);

          // Keep pipeline full
          schedule(i);
          for (let k = 1; k <= PREFETCH_AHEAD; k++) schedule(i + k);

          setStatus('preparing');
          const blobPromise = inFlight.get(i)!;
          const blob = await blobPromise;
          inFlight.delete(i);

          if (!blob || isStoppedRef.current) break;

          setStatus('playing');
          await playAudioBlob(blob);

          for (let k = 1; k <= PREFETCH_AHEAD; k++) schedule(i + k);
        }

        if (!isStoppedRef.current) {
          setStatus('idle');
          setCurrentSegmentIndex(0);
        }
      } catch (err) {
        if (!isStoppedRef.current) {
          setError(err instanceof Error ? err.message : 'TTS failed');
          setStatus('error');
        }
      }
    },
    [fetchAudio, playAudioBlob, prefetchChunks, ensureAudio],
  );

  /**
   * Stop playback
   */
  const stop = useCallback(() => {
    isStoppedRef.current = true;
    isPausedRef.current = false;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setStatus('idle');
    setCurrentSegmentIndex(0);
    setTotalSegments(0);
  }, []);

  /**
   * Pause playback
   */
  const pause = useCallback(() => {
    isPausedRef.current = true;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setStatus('paused');
  }, []);

  /**
   * Resume playback
   */
  const resume = useCallback(() => {
    isPausedRef.current = false;
    if (audioRef.current) {
      audioRef.current.play();
    }
    setStatus('playing');
  }, []);

  return {
    status,
    isPlaying: status === 'playing',
    isPreparing: status === 'preparing',
    currentSegmentIndex,
    totalSegments,
    error,
    play,
    stop,
    pause,
    resume,
  };
}

/**
 * Utility to extract visible text from expanded DetailItems (top-to-bottom in DOM order).
 */
export function extractExpandedText(): TTSSegment[] {
  const segments: TTSSegment[] = [];

  // Do NOT use class selectors with Tailwind opacity (e.g. bg-neutral-800/50) because `/` breaks CSS selectors.
  // Instead, detect our DetailItem cards structurally:
  // - a toggle button with aria-expanded
  // - an expanded content container div.mt-2.pl-1
  const expandedToggleButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>('button[aria-expanded="true"]'),
  );

  for (const toggleButton of expandedToggleButtons) {
    // The DetailItem markup is: <div ...> <button aria-expanded>...</button> {!collapsed && <div class="mt-2 pl-1 ...">...</div>} </div>
    const card = toggleButton.closest('div');
    if (!card) continue;

    const contentDiv = card.querySelector<HTMLElement>('div.mt-2.pl-1');
    if (!contentDiv) continue;

    // Clone so we can remove non-readable elements before reading text.
    const clone = contentDiv.cloneNode(true) as HTMLElement;

    // Remove elements that should not be spoken.
    clone.querySelectorAll('img, svg, button, a, input, textarea, select, option').forEach(el => el.remove());

    const textContent = clone.textContent?.replace(/\s+/g, ' ').trim();

    if (textContent && textContent.length > 10) {
      const isGerman =
        /[äöüßÄÖÜ]/.test(textContent) ||
        /\b(und|oder|nicht|ist|sind|haben|werden|sein|bei)\b/i.test(textContent);

      segments.push({ text: textContent, language: isGerman ? 'de' : 'en' });
    }
  }

  return segments;
}
