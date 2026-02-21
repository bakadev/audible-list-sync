/**
 * Audnexus API Client
 *
 * Fetches audiobook metadata from local Audnexus instance.
 * Configure via AUDNEXUS_URL env var (defaults to http://localhost:3001).
 * Implements retry logic with exponential backoff for resilience.
 */

const AUDNEXUS_BASE_URL = process.env.AUDNEXUS_URL || 'http://localhost:3001'

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

    const data = await response.json()
    return data as AudnexTitle
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
 * @param asins - Array of ASINs to fetch
 * @param concurrency - Max concurrent requests (default: 10)
 * @returns Promise with array of results (nulls for failures)
 */
export async function fetchTitleMetadataBatch(
  asins: string[],
  concurrency: number = 10
): Promise<Array<AudnexTitle | null>> {
  const results: Array<AudnexTitle | null> = []

  // Process in batches
  for (let i = 0; i < asins.length; i += concurrency) {
    const batch = asins.slice(i, i + concurrency)
    const batchResults = await Promise.allSettled(
      batch.map(asin => fetchTitleMetadata(asin))
    )

    results.push(
      ...batchResults.map(result =>
        result.status === 'fulfilled' ? result.value : null
      )
    )
  }

  return results
}
