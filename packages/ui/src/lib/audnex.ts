/**
 * Audnexus API Client
 *
 * Fetches audiobook metadata from local Audnexus instance.
 * Configure via AUDNEXUS_URL env var (defaults to http://localhost:3001).
 * Implements retry logic with exponential backoff for resilience.
 */

const AUDNEXUS_BASE_URL = process.env.AUDNEXUS_URL || 'http://localhost:3001'

/**
 * In-memory metadata cache to avoid re-fetching the same ASIN repeatedly.
 * Cache entries expire after 10 minutes. Shared across requests in the same
 * server process, which is fine for a single-user / dev scenario.
 */
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes
const metadataCache = new Map<string, { data: AudnexTitle; expiresAt: number }>()

export interface AudnexTitle {
  asin: string
  title: string
  subtitle?: string
  authors?: Array<{ asin?: string; name: string }>
  narrators?: Array<{ asin?: string; name: string }>
  seriesPrimary?: { asin?: string; name: string; position?: string }
  seriesSecondary?: { asin?: string; name: string; position?: string }
  genres?: Array<{ asin: string; name: string; type: string }>
  runtimeLengthMin?: number
  description?: string
  summary?: string
  image?: string
  rating?: string
  releaseDate?: string
  publisherName?: string
  isbn?: string
  language?: string
  region?: string
  formatType?: string
  literatureType?: string
  copyright?: number
  isAdult?: boolean
}

interface FetchOptions {
  retries?: number
  retryDelay?: number
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Fetch title metadata from Audnex API with exponential backoff retry
 *
 * @param asin - The ASIN to fetch
 * @param options - Fetch options (retries, delay)
 * @returns Promise<AudnexTitle | null> - Returns null on failure
 */
export async function fetchTitleMetadata(
  asin: string,
  options: FetchOptions = {}
): Promise<AudnexTitle | null> {
  const { retries = 3, retryDelay = 1000 } = options

  // Check cache first
  const cached = metadataCache.get(asin)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data
  }
  // Remove expired entry
  if (cached) metadataCache.delete(asin)

  try {
    const response = await fetch(`${AUDNEXUS_BASE_URL}/books/${asin}`)

    // Handle rate limits and server errors with retry
    if (!response.ok) {
      if (response.status === 429 || response.status >= 500) {
        if (retries > 0) {
          // Exponential backoff: 1s, 2s, 4s for retries 3, 2, 1
          const backoffMs = Math.pow(2, 3 - retries) * retryDelay
          console.warn(
            `Audnex API error ${response.status} for ${asin}, retrying in ${backoffMs}ms (${retries} retries left)`
          )
          await sleep(backoffMs)
          return fetchTitleMetadata(asin, { retries: retries - 1, retryDelay })
        }
      }

      // Non-retryable errors (404, 400, etc)
      console.warn(
        `Audnex API error ${response.status} for ${asin}: ${response.statusText}`
      )
      return null
    }

    const data = await response.json() as AudnexTitle

    // Cache the result
    metadataCache.set(asin, { data, expiresAt: Date.now() + CACHE_TTL_MS })

    return data
  } catch (error) {
    console.error(`Audnex API network error for ${asin}:`, error)

    // Retry on network errors
    if (retries > 0) {
      const backoffMs = Math.pow(2, 3 - retries) * retryDelay
      console.warn(`Network error for ${asin}, retrying in ${backoffMs}ms`)
      await sleep(backoffMs)
      return fetchTitleMetadata(asin, { retries: retries - 1, retryDelay })
    }

    return null
  }
}

/**
 * Batch fetch multiple titles with concurrency limit
 *
 * TODO: Audnexus only supports single-ASIN fetches (GET /books/:asin).
 * Consider adding a POST /books/batch endpoint to the Audnexus fork, or
 * contributing one upstream (https://github.com/laxamentumtech/audnexus),
 * to eliminate the N+1 request pattern here.
 *
 * @param asins - Array of ASINs to fetch
 * @param concurrency - Max concurrent requests (default: 25, safe for local Audnexus)
 * @returns Promise with array of results (nulls for failures)
 */
export async function fetchTitleMetadataBatch(
  asins: string[],
  concurrency: number = 25
): Promise<Array<AudnexTitle | null>> {
  // Deduplicate ASINs and fetch unique ones only
  const uniqueAsins = [...new Set(asins)]
  const uniqueResults = new Map<string, AudnexTitle | null>()

  // Process unique ASINs in batches
  for (let i = 0; i < uniqueAsins.length; i += concurrency) {
    const batch = uniqueAsins.slice(i, i + concurrency)
    const batchResults = await Promise.allSettled(
      batch.map(asin => fetchTitleMetadata(asin))
    )

    batch.forEach((asin, index) => {
      const result = batchResults[index]
      uniqueResults.set(
        asin,
        result.status === 'fulfilled' ? result.value : null
      )
    })
  }

  // Map back to original order (including duplicates)
  return asins.map(asin => uniqueResults.get(asin) ?? null)
}
