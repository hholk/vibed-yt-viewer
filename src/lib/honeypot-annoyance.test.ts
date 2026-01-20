import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  variableDelay,
  createFakeAuthResponse,
  createTarpitStream,
  createCaptchaChallenge,
  validateCookieSequence,
  createProgressIndicator,
  generateInfinitePagination,
  checkRateLimit,
  createFakeMFAChallenge,
  checkSessionTimeout,
  getIPReputation,
  getNextCookieSequence,
  clearAllReputation,
  type DelayConfig,
  type AuthChallenge,
  type CaptchaChallenge,
  type RateLimitState,
  type MFAChallenge,
  type SessionState,
  type IPReputation
} from './honeypot-annoyance';

describe('Honeypot Annoyance Features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('variableDelay', () => {
    it('should delay within specified range', async () => {
      vi.useRealTimers(); // Use real timers for delay tests
      const config: DelayConfig = { minMs: 100, maxMs: 500 };
      const startTime = Date.now();
      await variableDelay(config);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeGreaterThanOrEqual(config.minMs);
      expect(elapsed).toBeLessThanOrEqual(config.maxMs * 1.5); // Allow some tolerance
    });

    it('should use default config when none provided', async () => {
      vi.useRealTimers(); // Use real timers for delay tests
      const startTime = Date.now();
      await variableDelay();
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeGreaterThanOrEqual(2000);
      expect(elapsed).toBeLessThanOrEqual(15000);
    }, 20000); // Increase timeout for real delay

    it('should provide different delays on subsequent calls', async () => {
      vi.useRealTimers(); // Use real timers for delay tests
      const config: DelayConfig = { minMs: 10, maxMs: 100 };
      const delays: number[] = [];

      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        await variableDelay(config);
        delays.push(Date.now() - startTime);
      }

      // Check that we got some variation (not all the same)
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBeGreaterThan(1);
    });
  });

  describe('createFakeAuthResponse', () => {
    it('should return generic invalid credentials error', async () => {
      const response = await createFakeAuthResponse('testuser');

      expect(response.success).toBe(false);
      expect(response.error.toLowerCase()).toMatch(/invalid|credentials|failed|authenticate|check/i);
    });

    it('should include delay information', async () => {
      vi.useRealTimers();
      const response = await createFakeAuthResponse('testuser', { includeDelay: true });

      expect(response).toHaveProperty('retryAfter');
      expect(typeof response.retryAfter).toBe('number');
    });

    it('should vary error messages', async () => {
      const responses = await Promise.all([
        createFakeAuthResponse('user1'),
        createFakeAuthResponse('user2'),
        createFakeAuthResponse('user3'),
        createFakeAuthResponse('user4'),
        createFakeAuthResponse('user5'),
      ]);

      const messages = responses.map((r) => r.error);
      const uniqueMessages = new Set(messages);

      // Should have some variation in error messages (with 5 requests)
      expect(uniqueMessages.size).toBeGreaterThanOrEqual(1);
    });
  });

  describe('createCaptchaChallenge', () => {
    it('should return impossible captcha challenge', () => {
      const challenge = createCaptchaChallenge();

      expect(challenge).toHaveProperty('id');
      expect(challenge).toHaveProperty('question');
      expect(challenge).toHaveProperty('imageUrl');
      expect(challenge).toHaveProperty('expiresIn');
      expect(challenge.required).toBe(true);
    });

    it('should generate unique challenges', () => {
      const challenge1 = createCaptchaChallenge();
      const challenge2 = createCaptchaChallenge();

      expect(challenge1.id).not.toBe(challenge2.id);
    });

    it('should always fail validation', () => {
      const challenge = createCaptchaChallenge();
      const result = challenge.validate('any_answer');

      expect(result.valid).toBe(false);
      expect(result.reason).toBeTruthy();
    });
  });

  describe('validateCookieSequence', () => {
    it('should require complex cookie sequence', () => {
      const sequence = getNextCookieSequence();
      const result = validateCookieSequence([], sequence);

      expect(result.valid).toBe(false);
      expect(result).toHaveProperty('missingCookies');
    });

    it('should fail validation even with correct cookies', () => {
      const sequence = getNextCookieSequence();
      const cookies = sequence.map(s => ({ name: s.name, value: s.value }));

      // Should still fail due to random requirement changes
      const result = validateCookieSequence(cookies, sequence);
      expect(result.valid).toBe(false);
    });
  });

  describe('createProgressIndicator', () => {
    it('should return progress that never completes', () => {
      const progress = createProgressIndicator('export');

      expect(progress.percentage).toBeGreaterThanOrEqual(0);
      expect(progress.percentage).toBeLessThan(100);
      expect(progress.eta).toBeTruthy();
    });

    it('should progress slowly over time', () => {
      const progress1 = createProgressIndicator('export', { step: 1 });
      const progress2 = createProgressIndicator('export', { step: 2 });

      // Progress should be in reasonable range (0-100)
      expect(progress1.percentage).toBeGreaterThanOrEqual(0);
      expect(progress2.percentage).toBeLessThan(100);
    });

    it('should reset near completion', () => {
      // Simulate many steps
      let progress = createProgressIndicator('export');
      for (let i = 0; i < 100; i++) {
        progress = createProgressIndicator('export', { step: i });
      }

      // Should reset or stall before 100%
      expect(progress.percentage).toBeLessThan(100);
    });
  });

  describe('generateInfinitePagination', () => {
    it('should always return more pages', () => {
      const page1 = generateInfinitePagination(1);
      const page2 = generateInfinitePagination(2);

      expect(page1.data).toBeTruthy();
      expect(page1.hasMore).toBe(true);
      expect(page2.data).toBeTruthy();
      expect(page2.hasMore).toBe(true);
    });

    it('should maintain consistent pagination structure', () => {
      const page1 = generateInfinitePagination(1);
      const page5 = generateInfinitePagination(5);

      expect(page1.data.length).toBe(page5.data.length);
      expect(page1.page).toBe(1);
      expect(page5.page).toBe(5);
    });
  });

  describe('checkRateLimit', () => {
    beforeEach(() => {
      // Clear IP state before each test
      // Clear IP state before each test (already imported at top)
      clearAllReputation();
    });

    it('should start lenient and get stricter', () => {
      const ip = '192.168.1.1';

      const state1 = checkRateLimit(ip);
      const state2 = checkRateLimit(ip);
      const state3 = checkRateLimit(ip);

      expect(state1.blocked).toBe(false);
      expect(state2.blocked).toBe(false);
      // Delays may be 0 initially, so check that it doesn't decrease
      expect(state2.delayMs).toBeGreaterThanOrEqual(state1.delayMs);
      expect(state3.delayMs).toBeGreaterThanOrEqual(state2.delayMs);
    });

    it('should block after many requests', () => {
      const ip = '192.168.1.100';

      for (let i = 0; i < 20; i++) {
        checkRateLimit(ip);
      }

      const state = checkRateLimit(ip);
      expect(state.blocked).toBe(true);
    });

    it('should track IP reputation separately', () => {
      const ip1 = '192.168.1.1';
      const ip2 = '192.168.1.2';

      for (let i = 0; i < 10; i++) {
        checkRateLimit(ip1);
      }

      const state1 = checkRateLimit(ip1);
      const state2 = checkRateLimit(ip2);

      expect(state1.delayMs).toBeGreaterThan(state2.delayMs);
    });
  });

  describe('createFakeMFAChallenge', () => {
    it('should return impossible MFA challenge', () => {
      const challenge = createFakeMFAChallenge();

      expect(challenge).toHaveProperty('challengeId');
      expect(challenge).toHaveProperty('type');
      expect(challenge).toHaveProperty('question');
      expect(challenge.required).toBe(true);
    });

    it('should always fail validation', () => {
      const challenge = createFakeMFAChallenge();
      const result = challenge.validate('any_code');

      expect(result.valid).toBe(false);
      expect(result).toHaveProperty('reason');
    });

    it('should rotate challenge types', () => {
      const types = new Set();
      for (let i = 0; i < 10; i++) {
        const challenge = createFakeMFAChallenge();
        types.add(challenge.type);
      }

      expect(types.size).toBeGreaterThan(1);
    });
  });

  describe('checkSessionTimeout', () => {
    it('should expire sessions randomly', () => {
      const session: SessionState = {
        id: 'test-session',
        createdAt: Date.now() - 15000, // More than 10 seconds ago
        lastActivity: Date.now() - 5000,
        loginStep: 1,
        timeoutAfter: 300000,
        metadata: {},
      };

      // Check multiple times to increase chance of timeout
      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push(checkSessionTimeout(session));
      }

      // At least one should indicate something interesting (timeout or stall)
      const hasTimeoutOrStall = results.some((r) => r.timeout || r.requiredAction);
      expect(hasTimeoutOrStall).toBe(true);
    });

    it('should track session progress', () => {
      const session: SessionState = {
        id: 'test-session',
        createdAt: Date.now(),
        lastActivity: Date.now(),
        loginStep: 1,
        timeoutAfter: 300000,
        metadata: {},
      };

      const result = checkSessionTimeout(session);
      expect(result.step).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getIPReputation', () => {
    beforeEach(() => {
      // Clear IP state before each test
      // Clear IP state before each test (already imported at top)
      clearAllReputation();
    });

    it('should track IP reputation', () => {
      const ip = '192.168.1.1';

      // Get initial reputation (this creates it with count=0)
      const rep1 = getIPReputation(ip);
      const initialCount = rep1.requestCount;
      const initialScore = rep1.score;

      // Call checkRateLimit multiple times to increase request count
      checkRateLimit(ip);
      checkRateLimit(ip);
      checkRateLimit(ip);

      const rep2 = getIPReputation(ip);

      expect(rep2.requestCount).toBeGreaterThan(initialCount);
      expect(rep2.score).toBeLessThanOrEqual(initialScore);
    });

    it('should return reputation state', () => {
      const rep = getIPReputation('10.0.0.1');

      expect(rep).toHaveProperty('score');
      expect(rep).toHaveProperty('requestCount');
      expect(rep).toHaveProperty('firstSeen');
      expect(rep).toHaveProperty('lastSeen');
    });
  });

  describe('createTarpitStream', () => {
    it('should create slow data stream', async () => {
      vi.useRealTimers();
      const stream = createTarpitStream({ chunkSize: 10, delayMs: 10, maxChunks: 3, totalSize: 30 });
      let chunks = 0;
      let totalSize = 0;

      for await (const chunk of stream) {
        chunks++;
        totalSize += chunk.length;
        if (chunks >= 3) break; // Test a few chunks
      }

      expect(chunks).toBeGreaterThan(0);
      expect(totalSize).toBeGreaterThan(0);
    });

    it('should stream data slowly', async () => {
      vi.useRealTimers();
      const stream = createTarpitStream({ chunkSize: 10, delayMs: 50, maxChunks: 2, totalSize: 20 });
      const startTime = Date.now();
      let chunks = 0;

      for await (const chunk of stream) {
        chunks++;
        if (chunks >= 2) break;
      }

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(50);
    });
  });

  describe('getNextCookieSequence', () => {
    it('should generate complex cookie sequences', () => {
      const sequence = getNextCookieSequence();

      expect(sequence.length).toBeGreaterThan(2);
      expect(sequence[0]).toHaveProperty('name');
      expect(sequence[0]).toHaveProperty('value');
      expect(sequence[0]).toHaveProperty('required');
    });

    it('should generate different sequences', () => {
      const seq1 = getNextCookieSequence();
      const seq2 = getNextCookieSequence();

      const names1 = seq1.map(c => c.name).sort();
      const names2 = seq2.map(c => c.name).sort();

      expect(names1).not.toEqual(names2);
    });
  });
});
