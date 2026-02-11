import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-change-in-production";
const TOKEN_EXPIRY = "15m"; // 15 minutes

export interface SyncTokenPayload {
  sub: string; // user ID
  jti: string; // JWT ID (unique identifier)
  scope: "sync:upload";
  iat?: number;
  exp?: number;
}

/**
 * Generate a sync token for extension upload
 * @param userId - User ID to encode in token
 * @returns Object with JWT token, jti (for database tracking), and expiration date
 */
export function generateSyncToken(userId: string): {
  token: string;
  jti: string;
  expiresAt: Date;
} {
  const jti = uuidv4();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

  const payload: SyncTokenPayload = {
    sub: userId,
    jti,
    scope: "sync:upload",
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: TOKEN_EXPIRY,
  });

  return { token, jti, expiresAt };
}

/**
 * Verify and decode a sync token
 * @param token - JWT token to verify
 * @returns Decoded payload if valid
 * @throws Error if token is invalid, expired, or has wrong scope
 */
export function verifySyncToken(token: string): SyncTokenPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"],
    }) as SyncTokenPayload;

    // Verify scope
    if (decoded.scope !== "sync:upload") {
      throw new Error("Invalid token scope");
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("Token expired");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error("Invalid token");
    }
    throw error;
  }
}

/**
 * Extract token from Authorization header
 * @param authHeader - Authorization header value
 * @returns Token string or null
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return null;
  }

  return parts[1];
}
