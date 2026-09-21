/**
 * API client with error handling
 * Adapted from Birding Weather Dashboard
 */

export class ApiError extends Error {
    constructor(message, status = 0, response = null) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.response = response;
    }
}

/**
 * Tunable so tests can shrink the delays. Open-Meteo rejects bursts with 429, and a
 * page load fires about 3 requests per venue at once, so requests are queued and a
 * 429 is retried instead of surfacing as missing data.
 */
export const retryConfig = { maxRetries: 2, baseDelayMs: 1000, maxDelayMs: 8000, maxConcurrent: 4, timeoutMs: 20000 };

let activeRequests = 0;
const waiting = [];

function acquireSlot() {
    if (activeRequests < retryConfig.maxConcurrent) {
        activeRequests++;
        return Promise.resolve();
    }
    return new Promise(resolve => waiting.push(resolve));
}

function releaseSlot() {
    const next = waiting.shift();
    if (next) next();           // hand the slot straight to the next waiter
    else activeRequests--;
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Honor Retry-After when the server exposes it (seconds), else back off exponentially.
// Jitter keeps a batch of retries from all landing on the same instant.
function retryDelayMs(response, attempt) {
    const header = Number(response.headers?.get?.('Retry-After'));
    const base = Number.isFinite(header) && header > 0
        ? header * 1000
        : retryConfig.baseDelayMs * 2 ** attempt;
    return Math.min(base + Math.random() * retryConfig.baseDelayMs * 0.4, retryConfig.maxDelayMs);
}

/**
 * fetch with a concurrency cap and retry on 429. Returns the final Response, which
 * may still be a 429 once retries run out, so callers keep their own error handling.
 */
export async function fetchWithRetry(url, options = {}) {
    for (let attempt = 0; ; attempt++) {
        await acquireSlot();
        let response;
        try {
            // The page waits for every request before it renders, so one that never
            // finishes would leave every card on "--" forever. The timeout also bounds
            // reading the body, and frees this request's slot.
            const signal = options.signal
                ?? (typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(retryConfig.timeoutMs) : undefined);
            response = await fetch(url, { ...options, signal });
        } finally {
            releaseSlot();      // free the slot before any backoff sleep
        }
        if (response.status !== 429 || attempt >= retryConfig.maxRetries) return response;
        console.warn(`429 from ${new URL(url).hostname}, retrying (${attempt + 1}/${retryConfig.maxRetries})`);
        await sleep(retryDelayMs(response, attempt));
    }
}

export async function fetchWithErrorHandling(url, options = {}) {
    const defaultOptions = {
        headers: { 'Accept': 'application/json' }
    };

    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: { ...defaultOptions.headers, ...options.headers }
    };

    try {
        const response = await fetchWithRetry(url, mergedOptions);

        if (!response.ok) {
            throw new ApiError(
                `API error: ${response.status} ${response.statusText}`,
                response.status,
                response
            );
        }

        const data = await response.json();
        return { data, error: null };
    } catch (error) {
        if (error instanceof ApiError) {
            console.error('API Error:', error.message);
            return { data: null, error };
        }

        console.error('Network Error:', error.message);
        return {
            data: null,
            error: new ApiError(error.message, 0, null)
        };
    }
}

export function sanitizeErrorMessage(message) {
    if (typeof message !== 'string') return 'An unknown error occurred';
    return message
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
