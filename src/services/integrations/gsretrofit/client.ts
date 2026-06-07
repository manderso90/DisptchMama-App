// GS Retrofit Dispatch API — server-only HTTP client.
//
// Handles base URL, bearer auth, query-string building, and graceful non-2xx
// handling. Every call returns a typed GsrResult discriminated union instead of
// throwing on API/network failures — callers branch on `result.ok`.
//
// A MISSING API KEY is treated differently: it's a configuration error, so we
// fail loudly (throw) rather than swallow it into a result.
//
// Swagger UI: https://gsretrofit.com/api/rest/dispatch/docs/
//
// Server-only by construction: this module is imported only from server
// contexts (route handlers, server actions), and the API key is a non-public
// env var (no NEXT_PUBLIC_ prefix), so it is undefined in any client bundle and
// getApiKey() would throw immediately. Do not import this from a 'use client' file.

/** Base URL — note the `/api/rest/dispatch` path (not `/api/dispatch`). */
const BASE_URL = 'https://gsretrofit.com/api/rest/dispatch'

/** A typed API/network error. `status` is the HTTP status, or null for network/parse failures. */
export interface GsrError {
  status: number | null
  message: string
  details?: unknown
}

/** Discriminated result — success carries typed data, failure carries a typed error. */
export type GsrResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: GsrError }

interface RequestOptions {
  method?: 'GET' | 'POST'
  query?: Record<string, string | undefined>
  body?: unknown
}

/**
 * Read the server-side API key. Throws loudly if missing — this is a config
 * error, not a recoverable runtime condition.
 */
function getApiKey(): string {
  const key = process.env.GSRETROFIT_DISPATCH_API_KEY
  if (!key) {
    throw new Error(
      'GSRETROFIT_DISPATCH_API_KEY is not set. Add it to .env.local (server-side only, no NEXT_PUBLIC_ prefix).'
    )
  }
  return key
}

function buildUrl(path: string, query?: Record<string, string | undefined>): string {
  let url = `${BASE_URL}${path}`
  if (query) {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') params.set(key, value)
    }
    const qs = params.toString()
    if (qs) url += `?${qs}`
  }
  return url
}

/**
 * Core request helper. Never throws on API/network errors — returns a typed
 * GsrError instead. Only a missing API key throws (via getApiKey).
 */
export async function gsrRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<GsrResult<T>> {
  const { method = 'GET', query, body } = options

  // Resolve the key up front so a missing key fails loudly rather than being
  // caught below and reported as a generic network error.
  const apiKey = getApiKey()
  const url = buildUrl(path, query)

  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      // Always hit the live system of record — never serve cached dispatch data.
      cache: 'no-store',
    })
  } catch (err) {
    return {
      ok: false,
      error: {
        status: null,
        message: `Network error calling GS Retrofit ${method} ${path}: ${
          err instanceof Error ? err.message : String(err)
        }`,
        details: err,
      },
    }
  }

  // Read the raw body once; it may be empty or non-JSON on errors.
  const text = await response.text()
  let parsed: unknown = undefined
  if (text) {
    try {
      parsed = JSON.parse(text)
    } catch {
      return {
        ok: false,
        error: {
          status: response.status,
          message: `GS Retrofit ${method} ${path} returned a non-JSON body (HTTP ${response.status}): ${text.slice(0, 200)}`,
        },
      }
    }
  }

  if (!response.ok) {
    // The spec documents a `{ "error": string }` body for 400s.
    const apiMessage =
      parsed && typeof parsed === 'object' && parsed !== null && 'error' in parsed
        ? String((parsed as { error: unknown }).error)
        : `HTTP ${response.status}`
    return {
      ok: false,
      error: {
        status: response.status,
        message: `GS Retrofit ${method} ${path} failed: ${apiMessage}`,
        details: parsed,
      },
    }
  }

  return { ok: true, data: parsed as T }
}
