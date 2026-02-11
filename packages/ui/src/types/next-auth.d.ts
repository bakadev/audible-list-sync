/**
 * NextAuth Type Extensions
 *
 * Extends default NextAuth types to include custom user properties
 * T061: Add isAdmin flag to User and Session types
 */

import { DefaultSession, DefaultUser } from 'next-auth'
import { JWT, DefaultJWT } from 'next-auth/jwt'

declare module 'next-auth' {
  /**
   * Extend the default Session interface
   */
  interface Session extends DefaultSession {
    user: {
      id: string
      isAdmin: boolean
    } & DefaultSession['user']
  }

  /**
   * Extend the default User interface
   */
  interface User extends DefaultUser {
    isAdmin: boolean
  }
}

declare module 'next-auth/jwt' {
  /**
   * Extend the default JWT interface
   */
  interface JWT extends DefaultJWT {
    id: string
    isAdmin: boolean
  }
}
