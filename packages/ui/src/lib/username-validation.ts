interface ValidationResult {
  valid: boolean
  error?: string
}

const RESERVED_USERNAMES = [
  'api',
  'admin',
  'auth',
  'signin',
  'login',
  'register',
  'dashboard',
  'library',
  'lists',
  'settings',
  '_next',
  'favicon.ico',
  'robots.txt',
  'sitemap.xml',
]

const USERNAME_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/

export function validateUsername(username: unknown): ValidationResult {
  if (typeof username !== 'string' || username.length === 0) {
    return { valid: false, error: 'Username is required' }
  }

  if (username !== username.toLowerCase()) {
    return { valid: false, error: 'Username must be lowercase' }
  }

  if (username.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' }
  }

  if (username.length > 30) {
    return { valid: false, error: 'Username must be 30 characters or fewer' }
  }

  if (!USERNAME_PATTERN.test(username)) {
    return {
      valid: false,
      error:
        'Username may only contain lowercase letters, numbers, and hyphens, and must not start or end with a hyphen or contain consecutive hyphens',
    }
  }

  if (username.includes('--')) {
    return {
      valid: false,
      error: 'Username must not contain consecutive hyphens',
    }
  }

  if (isReservedUsername(username)) {
    return { valid: false, error: 'This username is reserved' }
  }

  return { valid: true }
}

export function isReservedUsername(username: string): boolean {
  return RESERVED_USERNAMES.includes(username.toLowerCase())
}
