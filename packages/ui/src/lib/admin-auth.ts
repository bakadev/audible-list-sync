/**
 * Admin Authentication Utilities
 *
 * Provides type guards and auth checks for admin-only routes and operations
 */

import { User } from '@prisma/client'

/**
 * Type guard to check if user is an admin
 *
 * @param user - User object (can be null/undefined)
 * @returns True if user exists and has isAdmin flag set
 */
export function isAdmin(
  user: User | null | undefined
): user is User & { isAdmin: true } {
  return user?.isAdmin === true
}

/**
 * Require admin access - throws error if user is not admin
 *
 * @param user - User object to check
 * @throws Error if user is not admin
 */
export function requireAdmin(user: User | null | undefined): asserts user is User & { isAdmin: true } {
  if (!isAdmin(user)) {
    throw new Error('Unauthorized: Admin access required')
  }
}

/**
 * Check if user has admin privileges (returns boolean instead of throwing)
 *
 * @param user - User object to check
 * @returns True if user is admin, false otherwise
 */
export function hasAdminAccess(user: User | null | undefined): boolean {
  return isAdmin(user)
}
