import crypto from "crypto";

export const TOKEN_BYTE_LENGTH = 32; // 256 bits of entropy
export const DEFAULT_INVITATION_EXPIRY_DAYS = 7;

/**
 * Generates a cryptographically secure random token (64 hex characters = 256 bits).
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(TOKEN_BYTE_LENGTH).toString("hex");
}

/**
 * Computes the SHA-256 hash of a token for safe database storage and lookup.
 * Raw tokens are never stored in the database.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token.trim()).digest("hex");
}

/**
 * Calculates expiration timestamp from now.
 */
export function calculateExpiryDate(days: number = DEFAULT_INVITATION_EXPIRY_DAYS): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Returns the public portal base URL for links.
 * Defaults to https://id.codxa-agency.online in production.
 */
export function getPortalBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_PORTAL_URL) {
    return process.env.NEXT_PUBLIC_PORTAL_URL.replace(/\/$/, "");
  }
  if (process.env.NODE_ENV === "production") {
    return "https://id.codxa-agency.online";
  }
  return "http://localhost:3005";
}

/**
 * Builds the full personal upload link for an intern.
 */
export function buildUploadUrl(rawToken: string): string {
  return `${getPortalBaseUrl()}/upload/${rawToken}`;
}
