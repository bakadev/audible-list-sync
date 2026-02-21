interface ValidationResult {
  valid: boolean
  error?: string
}

export function validateListName(name: unknown): ValidationResult {
  if (typeof name !== 'string' || name.trim().length === 0) {
    return { valid: false, error: 'List name is required' }
  }

  const trimmed = name.trim()

  if (trimmed.length < 3) {
    return { valid: false, error: 'List name must be at least 3 characters' }
  }

  if (trimmed.length > 80) {
    return { valid: false, error: 'List name must be 80 characters or fewer' }
  }

  return { valid: true }
}

export function validateListDescription(description: unknown): ValidationResult {
  if (description === null || description === undefined) {
    return { valid: true }
  }

  if (typeof description !== 'string') {
    return { valid: false, error: 'Description must be a string' }
  }

  const trimmed = description.trim()

  if (trimmed.length > 500) {
    return { valid: false, error: 'Description must be 500 characters or fewer' }
  }

  return { valid: true }
}

export function validateListType(type: unknown): ValidationResult {
  if (type !== 'RECOMMENDATION' && type !== 'TIER') {
    return { valid: false, error: 'List type must be RECOMMENDATION or TIER' }
  }

  return { valid: true }
}

export function validateTiers(tiers: unknown): ValidationResult {
  if (!Array.isArray(tiers)) {
    return { valid: false, error: 'Tiers must be an array' }
  }

  if (tiers.length < 1) {
    return { valid: false, error: 'At least one tier is required' }
  }

  if (tiers.length > 10) {
    return { valid: false, error: 'A maximum of 10 tiers is allowed' }
  }

  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i]

    if (typeof tier !== 'string') {
      return { valid: false, error: `Tier at index ${i} must be a string` }
    }

    const trimmed = tier.trim()

    if (trimmed.length < 1) {
      return { valid: false, error: `Tier at index ${i} must not be empty` }
    }

    if (trimmed.length > 20) {
      return {
        valid: false,
        error: `Tier at index ${i} must be 20 characters or fewer`,
      }
    }
  }

  return { valid: true }
}

export function validateListItems(
  items: Array<{ titleAsin: string }>,
  maxItems: number = 100
): ValidationResult {
  if (!Array.isArray(items)) {
    return { valid: false, error: 'Items must be an array' }
  }

  if (items.length > maxItems) {
    return {
      valid: false,
      error: `A maximum of ${maxItems} items is allowed`,
    }
  }

  const seen = new Set<string>()

  for (const item of items) {
    if (!item.titleAsin || typeof item.titleAsin !== 'string') {
      return { valid: false, error: 'Each item must have a valid titleAsin' }
    }

    if (seen.has(item.titleAsin)) {
      return {
        valid: false,
        error: `Duplicate ASIN found: ${item.titleAsin}`,
      }
    }

    seen.add(item.titleAsin)
  }

  return { valid: true }
}
