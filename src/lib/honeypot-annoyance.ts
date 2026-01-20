/**
 * Honeypot Annoyance Module
 *
 * Provides various "annoyance" features to waste attacker time and resources.
 * These are designed to be frustrating but not completely block legitimate traffic
 * (though the real purpose is to slow down automated scanners).
 */

// ============================================================================
// Types
// ============================================================================

export interface DelayConfig {
  minMs: number
  maxMs: number
}

export interface AuthChallenge {
  success: false
  error: string
  retryAfter?: number
  attemptsRemaining?: number
  hint?: string
}

export interface CaptchaChallenge {
  id: string
  type: 'image' | 'audio' | 'puzzle' | 'math'
  question: string
  imageUrl?: string
  audioUrl?: string
  required: boolean
  expiresIn: number
  difficulty: 'easy' | 'medium' | 'hard' | 'impossible'
  validate: (answer: string) => { valid: boolean; reason: string }
}

export interface CookieRequirement {
  name: string
  value: string
  required: boolean
  expiresAt: number
  httpOnly: boolean
  secure: boolean
  sameSite: 'strict' | 'lax' | 'none'
}

export interface ProgressIndicator {
  operation: string
  percentage: number
  eta: string
  currentStep: string
  totalSteps: number
  completedSteps: number
  message: string
}

export interface PaginatedResult<T = any> {
  data: T[]
  page: number
  perPage: number
  total: number
  hasMore: boolean
  nextPageCursor?: string
}

export interface RateLimitState {
  allowed: boolean
  blocked: boolean
  delayMs: number
  retryAfter?: number
  remaining: number
  limit: number
  windowMs: number
}

export interface MFAChallenge {
  challengeId: string
  type: 'totp' | 'sms' | 'email' | 'push' | 'hardware' | 'backup'
  question: string
  maskedValue: string
  required: boolean
  expiresAt: number
  validate: (code: string) => { valid: boolean; reason: string }
}

export interface SessionState {
  id: string
  createdAt: number
  lastActivity: number
  loginStep: number
  timeoutAfter: number
  metadata: Record<string, any>
}

export interface SessionCheckResult {
  valid: boolean
  timeout: boolean
  step: number
  message: string
  requiredAction?: string
}

export interface IPReputation {
  score: number // 0-100, lower is worse
  requestCount: number
  firstSeen: number
  lastSeen: number
  blockedUntil?: number
  flags: string[]
}

export interface TarpitConfig {
  chunkSize: number
  delayMs: number
  maxChunks: number
  totalSize: number
}

export interface CookieSequence {
  valid: boolean
  missingCookies: string[]
  invalidCookies: string[]
  expiredCookies: string[]
  requiredNextStep?: string
}

// ============================================================================
// In-Memory State
// ============================================================================

const ipReputationMap = new Map<string, IPReputation>()
const rateLimitState = new Map<string, { count: number; resetAt: number }>()
const sessionStore = new Map<string, SessionState>()

// ============================================================================
// Variable Delays
// ============================================================================

/**
 * Apply a random delay between min and max milliseconds
 * @param config - Optional delay configuration
 * @returns Promise that resolves after the delay
 */
export async function variableDelay(config: DelayConfig = { minMs: 2000, maxMs: 10000 }): Promise<void> {
  const delay = Math.floor(Math.random() * (config.maxMs - config.minMs + 1)) + config.minMs
  await new Promise(resolve => setTimeout(resolve, delay))
  return
}

// ============================================================================
// Fake Authentication
// ============================================================================

const authErrorMessages = [
  'Invalid username or password',
  'Authentication failed. Please check your credentials.',
  'The credentials you provided are incorrect.',
  'Login failed. Please try again.',
  'Invalid credentials. Please verify and retry.',
  'Authentication error: Credentials rejected.',
  'Unable to authenticate. Check your username and password.',
]

const authHints = [
  'Hint: Passwords are case-sensitive',
  'Hint: Make sure Caps Lock is not enabled',
  'Hint: Your username is your email address',
  'Hint: Use the password you created during registration',
  'Hint: Contact support if you continue to have issues',
]

/**
 * Create a fake authentication failure response
 * @param username - The username that was attempted
 * @param options - Additional options
 * @returns Authentication challenge response
 */
export async function createFakeAuthResponse(
  username: string,
  options: { includeDelay?: boolean; attemptsRemaining?: number } = {}
): Promise<AuthChallenge> {
  if (options.includeDelay) {
    await variableDelay({ minMs: 1000, maxMs: 3000 })
  }

  const errorIndex = Math.floor(Math.random() * authErrorMessages.length)
  const hintIndex = Math.floor(Math.random() * authHints.length)

  return {
    success: false,
    error: authErrorMessages[errorIndex],
    retryAfter: Math.floor(Math.random() * 5) + 1,
    attemptsRemaining: options.attemptsRemaining ?? Math.floor(Math.random() * 3) + 1,
    hint: authHints[hintIndex],
  }
}

// ============================================================================
// Tarpit Mode
// ============================================================================

/**
 * Create a slow data stream that trickles data
 * @param config - Tarpit configuration
 * @returns Async generator yielding data chunks
 */
export async function* createTarpitStream(
  config: TarpitConfig = { chunkSize: 100, delayMs: 2000, maxChunks: 50, totalSize: 5000 }
): AsyncGenerator<Buffer> {
  let sentBytes = 0
  let chunkCount = 0

  while (sentBytes < config.totalSize && chunkCount < config.maxChunks) {
    const remainingBytes = config.totalSize - sentBytes
    const chunkSize = Math.min(config.chunkSize, remainingBytes)

    // Generate fake data
    const chunk = Buffer.alloc(chunkSize, Math.random().toString(36).substring(2))

    yield chunk

    sentBytes += chunkSize
    chunkCount++

    // Delay before next chunk
    await new Promise(resolve => setTimeout(resolve, config.delayMs))
  }
}

// ============================================================================
// Fake Captcha
// ============================================================================

const captchaTypes: Array<'image' | 'audio' | 'puzzle' | 'math'> = ['image', 'audio', 'puzzle', 'math']

const captchaQuestions = [
  'Select all images containing a traffic light',
  'Select all squares with a bicycle',
  'Type the characters you see in the image',
  'Solve this math puzzle',
  'Rotate the image to the upright position',
  'Select all images with a crosswalk',
]

/**
 * Create a fake captcha challenge that's impossible to solve
 * @returns Captcha challenge object
 */
export function createCaptchaChallenge(): CaptchaChallenge {
  const id = `captcha_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  const type = captchaTypes[Math.floor(Math.random() * captchaTypes.length)]
  const question = captchaQuestions[Math.floor(Math.random() * captchaQuestions.length)]

  return {
    id,
    type,
    question,
    imageUrl: type === 'image' || type === 'puzzle' ? `/api/captcha/image/${id}` : undefined,
    audioUrl: type === 'audio' ? `/api/captcha/audio/${id}` : undefined,
    required: true,
    expiresIn: 300, // 5 minutes
    difficulty: 'impossible',
    validate: (answer: string) => ({
      valid: false,
      reason: Math.random() > 0.5 ? 'Captcha verification failed' : 'Session expired, please try again',
    }),
  }
}

// ============================================================================
// Cookie Hell
// ============================================================================

const cookieNames = [
  'session_id',
  'csrf_token',
  'auth_nonce',
  'tracking_id',
  'preferences',
  'consent',
  'locale',
  'timezone',
  'device_fingerprint',
  'security_token',
  'flow_token',
  'state_token',
]

/**
 * Generate the next required cookie sequence
 * @returns Array of cookie requirements
 */
export function getNextCookieSequence(): CookieRequirement[] {
  const sequenceLength = Math.floor(Math.random() * 4) + 3 // 3-6 cookies
  const shuffledNames = [...cookieNames].sort(() => Math.random() - 0.5)
  const selectedNames = shuffledNames.slice(0, sequenceLength)

  return selectedNames.map(name => ({
    name,
    value: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    required: Math.random() > 0.3, // 70% required
    expiresAt: Date.now() + Math.random() * 3600000, // 0-1 hour
    httpOnly: Math.random() > 0.5,
    secure: Math.random() > 0.3,
    sameSite: ['strict', 'lax', 'none'][Math.floor(Math.random() * 3)] as 'strict' | 'lax' | 'none',
  }))
}

/**
 * Validate a cookie sequence (always fails)
 * @param cookies - Provided cookies
 * @param requiredSequence - Required sequence
 * @returns Validation result
 */
export function validateCookieSequence(
  cookies: Array<{ name: string; value: string }>,
  requiredSequence: CookieRequirement[]
): CookieSequence {
  const providedNames = new Set(cookies.map(c => c.name))
  const missingCookies: string[] = []
  const invalidCookies: string[] = []
  const expiredCookies: string[] = []

  for (const required of requiredSequence) {
    if (!providedNames.has(required.name)) {
      missingCookies.push(required.name)
    } else {
      // Randomly mark valid cookies as invalid or expired
      if (Math.random() > 0.7) {
        invalidCookies.push(required.name)
      }
      if (required.expiresAt < Date.now() || Math.random() > 0.8) {
        expiredCookies.push(required.name)
      }
    }
  }

  // Always require at least one more cookie
  return {
    valid: false,
    missingCookies,
    invalidCookies,
    expiredCookies,
    requiredNextStep: Math.random() > 0.5 ? 'additional_auth_required' : 'cookie_verification_needed',
  }
}

// ============================================================================
// Fake Progress Indicators
// ============================================================================+

const operationSteps = [
  'Initializing...',
  'Loading resources...',
  'Verifying credentials...',
  'Establishing secure connection...',
  'Fetching user data...',
  'Processing request...',
  'Applying transformations...',
  'Generating response...',
  'Finalizing...',
  'Almost done...',
]

/**
 * Create a fake progress indicator for a long-running operation
 * @param operation - Operation name
 * @param options - Additional options
 * @returns Progress indicator
 */
export function createProgressIndicator(
  operation: string,
  options: { step?: number; startPercentage?: number } = {}
): ProgressIndicator {
  const step = options.step ?? 0
  let percentage = options.startPercentage ?? Math.floor(Math.random() * 20)

  // Increment percentage but reset if getting close to 100
  percentage += Math.floor(Math.random() * 5) + 1
  if (percentage > 95) {
    percentage = Math.floor(Math.random() * 30) + 40 // Jump back to 40-70%
  }

  const totalSteps = Math.floor(Math.random() * 10) + 15
  const completedSteps = Math.min(step, totalSteps - 1)

  const etaMinutes = Math.floor(Math.random() * 10) + 1
  const etaSeconds = Math.floor(Math.random() * 59)
  const eta = `${etaMinutes}m ${etaSeconds}s`

  return {
    operation,
    percentage,
    eta,
    currentStep: operationSteps[completedSteps % operationSteps.length],
    totalSteps,
    completedSteps,
    message: `Processing ${operation}... ${percentage}% complete`,
  }
}

// ============================================================================
// Infinite Pagination
// ============================================================================

/**
 * Generate infinite pagination results
 * @param page - Current page number
 * @returns Paginated result that always has more pages
 */
export function generateInfinitePagination<T = any>(page: number): PaginatedResult<T> {
  const perPage = 20
  const data = Array.from({ length: perPage }, (_, i) => ({
    id: `item_${page}_${i}`,
    name: `Item ${(page - 1) * perPage + i + 1}`,
    value: Math.random(),
  })) as T[]

  return {
    data,
    page,
    perPage,
    total: page * perPage + perPage, // Always claim there's more
    hasMore: true, // Always true
    nextPageCursor: `cursor_${Date.now()}_${Math.random().toString(36).substring(2)}`,
  }
}

// ============================================================================
// Progressive Rate Limiting
// ============================================================================

/**
 * Check and update rate limit for an IP (gets progressively stricter)
 * @param ip - IP address
 * @param options - Rate limit options
 * @returns Rate limit state
 */
export function checkRateLimit(
  ip: string,
  options: { baseLimit?: number; windowMs?: number } = {}
): RateLimitState {
  const baseLimit = options.baseLimit ?? 10
  const windowMs = options.windowMs ?? 60000 // 1 minute
  const now = Date.now()

  // Get or initialize IP reputation
  let reputation = ipReputationMap.get(ip)
  if (!reputation) {
    reputation = {
      score: 100,
      requestCount: 0,
      firstSeen: now,
      lastSeen: now,
      flags: [],
    }
    ipReputationMap.set(ip, reputation)
  }

  // Update reputation
  reputation.requestCount++
  reputation.lastSeen = now

  // Reduce score based on request count
  reputation.score = Math.max(0, reputation.score - Math.floor(reputation.requestCount / 5))

  // Get current window state
  let state = rateLimitState.get(ip)
  if (!state || now > state.resetAt) {
    state = { count: 0, resetAt: now + windowMs }
    rateLimitState.set(ip, state)
  }

  state.count++

  // Calculate effective limit based on reputation
  const effectiveLimit = Math.max(1, Math.floor(baseLimit * (reputation.score / 100)))
  const remaining = Math.max(0, effectiveLimit - state.count)

  // Calculate delay (progressive)
  const baseDelay = 1000
  const delayMultiplier = Math.max(1, state.count - effectiveLimit)
  const delayMs = state.count > effectiveLimit ? baseDelay * delayMultiplier * 2 : 0

  const blocked = state.count > effectiveLimit * 2 || reputation.score < 10

  return {
    allowed: !blocked,
    blocked,
    delayMs,
    retryAfter: blocked ? Math.floor(windowMs / 1000) : undefined,
    remaining,
    limit: effectiveLimit,
    windowMs,
  }
}

// ============================================================================
// Fake MFA
// ============================================================================+

const mfaTypes: Array<'totp' | 'sms' | 'email' | 'push' | 'hardware' | 'backup'> = [
  'totp',
  'sms',
  'email',
  'push',
  'hardware',
  'backup',
]

const mfaQuestions = [
  'Enter the 6-digit code from your authenticator app',
  'Enter the code sent to your mobile device',
  'Enter the code sent to your email',
  'Approve the login notification on your mobile device',
  'Insert your security key and press the button',
  'Enter one of your backup codes',
]

/**
 * Create a fake MFA challenge
 * @returns MFA challenge object
 */
export function createFakeMFAChallenge(): MFAChallenge {
  const challengeId = `mfa_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  const type = mfaTypes[Math.floor(Math.random() * mfaTypes.length)]
  const question = mfaQuestions[mfaTypes.indexOf(type)]

  let maskedValue = ''
  if (type === 'sms') maskedValue = '••• ••• ••23'
  else if (type === 'email') maskedValue = 'u••@e•••com'
  else if (type === 'totp') maskedValue = '123 456'
  else maskedValue = '••••••'

  return {
    challengeId,
    type,
    question,
    maskedValue,
    required: true,
    expiresAt: Date.now() + 300000, // 5 minutes
    validate: (code: string) => ({
      valid: false,
      reason: Math.random() > 0.5
        ? 'Invalid verification code'
        : 'Code expired. Please request a new one.',
    }),
  }
}

// ============================================================================
// Session Timeout Hell
// ============================================================================

/**
 * Check session status with random timeouts
 * @param session - Session state
 * @returns Session check result
 */
export function checkSessionTimeout(session: SessionState): SessionCheckResult {
  const now = Date.now()
  const elapsed = now - session.createdAt

  // Random timeout: 30% chance per check after 10 seconds
  const shouldTimeout = elapsed > 10000 && Math.random() < 0.3

  if (shouldTimeout) {
    return {
      valid: false,
      timeout: true,
      step: session.loginStep,
      message: 'Your session has expired. Please log in again.',
      requiredAction: 'restart_login',
    }
  }

  // Random progress or stall
  const shouldStall = Math.random() < 0.2

  if (shouldStall) {
    return {
      valid: true,
      timeout: false,
      step: session.loginStep,
      message: 'Additional verification required. Please complete the security check.',
      requiredAction: 'additional_verification',
    }
  }

  // Progress to next step
  session.loginStep++
  session.lastActivity = now

  return {
    valid: true,
    timeout: false,
    step: session.loginStep,
    message: `Authentication step ${session.loginStep} completed. Please continue.`,
  }
}

/**
 * Create a new session state
 * @returns New session object
 */
export function createSession(): SessionState {
  return {
    id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    loginStep: 1,
    timeoutAfter: Math.floor(Math.random() * 600000) + 300000, // 5-15 minutes
    metadata: {},
  }
}

// ============================================================================
// IP Reputation
// ============================================================================

/**
 * Get or create IP reputation data
 * @param ip - IP address
 * @returns IP reputation data
 */
export function getIPReputation(ip: string): IPReputation {
  let reputation = ipReputationMap.get(ip)

  if (!reputation) {
    reputation = {
      score: 100,
      requestCount: 0,
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      flags: [],
    }
    ipReputationMap.set(ip, reputation)
  }

  return reputation
}

/**
 * Reset IP reputation (for testing)
 * @param ip - IP address to reset
 */
export function resetIPReputation(ip: string): void {
  ipReputationMap.delete(ip)
  rateLimitState.delete(ip)
}

/**
 * Clear all reputation data (for testing)
 */
export function clearAllReputation(): void {
  ipReputationMap.clear()
  rateLimitState.clear()
  sessionStore.clear()
}
