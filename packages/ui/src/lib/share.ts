/**
 * Social share URL generator.
 *
 * Generates platform-specific share URLs for X, Facebook, Reddit, LinkedIn.
 * All parameters are URL-encoded.
 */

export type SharePlatform = 'x' | 'facebook' | 'reddit' | 'linkedin'

/**
 * Generate a social share URL for a given platform.
 *
 * @param platform  Target social platform
 * @param shareUrl  The full URL to share
 * @param title     Optional title text (used for X tweet text, Reddit title)
 * @returns Platform-specific share URL
 */
export function generateShareUrl(
  platform: SharePlatform,
  shareUrl: string,
  title?: string
): string {
  const encodedUrl = encodeURIComponent(shareUrl)
  const encodedTitle = title ? encodeURIComponent(title) : ''

  switch (platform) {
    case 'x':
      return title
        ? `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`
        : `https://twitter.com/intent/tweet?url=${encodedUrl}`

    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`

    case 'reddit':
      return title
        ? `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`
        : `https://www.reddit.com/submit?url=${encodedUrl}`

    case 'linkedin':
      return `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}`

    default:
      return shareUrl
  }
}
