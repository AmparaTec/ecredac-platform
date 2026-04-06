/**
 * E-CREDac — Base HTTP Client
 *
 * Fundação para todas as integrações externas.
 * Implementa: retry com exponential backoff, circuit breaker,
 * timeout, logging estruturado, rate limiting.
 *
 * @example
 * const client = new HttpClient({ baseUrl: 'https://api.example.com', name: 'ExampleAPI' })
 * const data = await client.get('/endpoint', { headers: { Authorization: 'Bearer ...' } })
 */

import { z } from 'zod'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface HttpClientConfig {
  baseUrl: string
  name: string
  timeout?: number          // ms, default 10000
  maxRetries?: number       // default 3
  retryBaseDelay?: number   // ms, default 500
  retryMaxDelay?: number    // ms, default 10000
  circuitThreshold?: number // failures before open, default 5
  circuitResetMs?: number   // ms before half-open, default 30000
  defaultHeaders?: Record<string, string>
  rateLimitPerMinute?: number
}

export interface HttpRequestOptions {
  headers?: Record<string, string>
  body?: unknown
  timeout?: number
  retries?: number
  signal?: AbortSignal
  skipRetry?: boolean
}

export class IntegrationError extends Error {
  constructor(
    message: string,
    public readonly integration: string,
    public readonly statusCode?: number,
    public readonly responseBody?: unknown,
    public readonly retryable: boolean = false,
  ) {
    super(message)
    this.name = 'IntegrationError'
  }
}

// ─── Circuit Breaker ─────────────────────────────────────────────────────────

type CircuitState = 'closed' | 'open' | 'half-open'

class CircuitBreaker {
  private state: CircuitState = 'closed'
  private failures = 0
  private lastFailureTime = 0

  constructor(
    private threshold: number,
    private resetMs: number,
    private name: string,
  ) {}

  canRequest(): boolean {
    if (this.state === 'closed') return true
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.resetMs) {
        this.state = 'half-open'
        return true
      }
      return false
    }
    return true // half-open: allow one request
  }

  onSuccess() {
    this.failures = 0
    this.state = 'closed'
  }

  onFailure() {
    this.failures++
    this.lastFailureTime = Date.now()
    if (this.failures >= this.threshold) {
      this.state = 'open'
      console.warn(`[${this.name}] Circuit breaker OPEN after ${this.failures} failures`)
    }
  }

  getState(): CircuitState { return this.state }
}

// ─── Rate Limiter (token bucket) ─────────────────────────────────────────────

class RateLimiter {
  private tokens: number
  private lastRefill: number

  constructor(
    private maxTokens: number,
    private refillRatePerMs: number,
  ) {
    this.tokens = maxTokens
    this.lastRefill = Date.now()
  }

  async acquire(): Promise<void> {
    this.refill()
    if (this.tokens >= 1) {
      this.tokens -= 1
      return
    }
    const waitMs = (1 - this.tokens) / this.refillRatePerMs
    await new Promise(r => setTimeout(r, Math.ceil(waitMs)))
    this.refill()
    this.tokens -= 1
  }

  private refill() {
    const now = Date.now()
    const elapsed = now - this.lastRefill
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRatePerMs)
    this.lastRefill = now
  }
}

// ─── HTTP Client ─────────────────────────────────────────────────────────────

export class HttpClient {
  private circuit: CircuitBreaker
  private rateLimiter?: RateLimiter
  private config: Required<HttpClientConfig>

  constructor(config: HttpClientConfig) {
    this.config = {
      timeout: 10_000,
      maxRetries: 3,
      retryBaseDelay: 500,
      retryMaxDelay: 10_000,
      circuitThreshold: 5,
      circuitResetMs: 30_000,
      defaultHeaders: {},
      rateLimitPerMinute: 0,
      ...config,
    }

    this.circuit = new CircuitBreaker(
      this.config.circuitThreshold,
      this.config.circuitResetMs,
      this.config.name,
    )

    if (this.config.rateLimitPerMinute > 0) {
      this.rateLimiter = new RateLimiter(
        this.config.rateLimitPerMinute,
        this.config.rateLimitPerMinute / 60_000,
      )
    }
  }

  async get<T = unknown>(path: string, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>('GET', path, options)
  }

  async post<T = unknown>(path: string, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>('POST', path, options)
  }

  async put<T = unknown>(path: string, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>('PUT', path, options)
  }

  async patch<T = unknown>(path: string, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>('PATCH', path, options)
  }

  async delete<T = unknown>(path: string, options?: HttpRequestOptions): Promise<T> {
    return this.request<T>('DELETE', path, options)
  }

  private async request<T>(method: string, path: string, options: HttpRequestOptions = {}): Promise<T> {
    if (!this.circuit.canRequest()) {
      throw new IntegrationError(
        `Circuit breaker OPEN — ${this.config.name} indisponivel`,
        this.config.name,
        503,
        undefined,
        true,
      )
    }

    if (this.rateLimiter) {
      await this.rateLimiter.acquire()
    }

    const maxRetries = options.skipRetry ? 0 : (options.retries ?? this.config.maxRetries)
    let lastError: IntegrationError | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = Math.min(
            this.config.retryBaseDelay * Math.pow(2, attempt - 1) + Math.random() * 200,
            this.config.retryMaxDelay,
          )
          await new Promise(r => setTimeout(r, delay))
        }

        const timeout = options.timeout ?? this.config.timeout
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), timeout)

        const url = `${this.config.baseUrl}${path}`
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...this.config.defaultHeaders,
          ...options.headers,
        }

        const fetchOptions: RequestInit = {
          method,
          headers,
          signal: options.signal ?? controller.signal,
        }

        if (options.body && method !== 'GET') {
          fetchOptions.body = JSON.stringify(options.body)
        }

        const startMs = Date.now()
        const response = await fetch(url, fetchOptions)
        clearTimeout(timer)
        const durationMs = Date.now() - startMs

        if (attempt > 0) {
          console.info(`[${this.config.name}] ${method} ${path} — retry ${attempt} succeeded (${durationMs}ms)`)
        }

        if (!response.ok) {
          const body = await response.text().catch(() => '')
          const parsed = safeJsonParse(body)
          const retryable = response.status >= 500 || response.status === 429

          lastError = new IntegrationError(
            `${this.config.name} ${method} ${path} → ${response.status}: ${typeof parsed === 'object' ? JSON.stringify(parsed) : body.slice(0, 200)}`,
            this.config.name,
            response.status,
            parsed,
            retryable,
          )

          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After')
            if (retryAfter) {
              await new Promise(r => setTimeout(r, parseInt(retryAfter) * 1000))
            }
          }

          if (!retryable || attempt === maxRetries) {
            this.circuit.onFailure()
            throw lastError
          }

          continue
        }

        this.circuit.onSuccess()

        const text = await response.text()
        return (text ? JSON.parse(text) : null) as T
      } catch (error) {
        if (error instanceof IntegrationError) throw error

        if (error instanceof DOMException && error.name === 'AbortError') {
          lastError = new IntegrationError(
            `${this.config.name} ${method} ${path} — timeout (${options.timeout ?? this.config.timeout}ms)`,
            this.config.name,
            undefined,
            undefined,
            true,
          )
        } else {
          lastError = new IntegrationError(
            `${this.config.name} ${method} ${path} — ${(error as Error).message}`,
            this.config.name,
            undefined,
            undefined,
            true,
          )
        }

        if (attempt === maxRetries) {
          this.circuit.onFailure()
          throw lastError
        }
      }
    }

    throw lastError ?? new IntegrationError('Unknown error', this.config.name)
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function safeJsonParse(text: string): unknown {
  try { return JSON.parse(text) } catch { return text }
}

/**
 * Validates environment variables at startup, throws descriptive error if missing.
 */
export function requireEnv(key: string, context: string): string {
  const value = process.env[key]
  if (!value) {
    throw new IntegrationError(
      `Variavel de ambiente ${key} obrigatoria para ${context}`,
      context,
      undefined,
      undefined,
      false,
    )
  }
  return value
}

/**
 * Optional environment variable with fallback.
 */
export function optionalEnv(key: string, fallback: string): string {
  return process.env[key] || fallback
}
