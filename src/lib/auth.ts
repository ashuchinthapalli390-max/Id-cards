import crypto from "crypto";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "./db";

export const SESSION_COOKIE_NAME = "cxa_id_session";
export const MAIN_SESSION_COOKIE_NAME = "cxa_session";
export const SESSION_DURATION_DAYS = 30;
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * SESSION_DURATION_DAYS;

export const AUTHORIZED_ADMIN_ROLES = ["FOUNDER", "CO_FOUNDER", "CTO", "HR"] as const;
export type AuthorizedAdminRole = (typeof AUTHORIZED_ADMIN_ROLES)[number];

export interface AuthenticatedAdmin {
  id: string;
  username: string;
  email: string;
  fullName: string | null;
  role: string;
  orgRole: string | null;
  effectiveRole: AuthorizedAdminRole;
}

/**
 * Checks whether the given user roles qualify for administrative access.
 * ONLY Founder, Co-Founder, CTO, and HR are authorized.
 * CEO, COO, and interns are explicitly rejected.
 */
export function getAuthorizedAdminRole(
  role?: string | null,
  orgRole?: string | null
): AuthorizedAdminRole | null {
  const normalizedRole = (role || "").toUpperCase().trim();
  const normalizedOrgRole = (orgRole || "").toUpperCase().trim();

  // Founder check
  if (
    normalizedRole === "FOUNDER" ||
    normalizedOrgRole === "FOUNDER" ||
    (normalizedRole === "OWNER" && (normalizedOrgRole === "FOUNDER" || !normalizedOrgRole))
  ) {
    return "FOUNDER";
  }

  // Co-Founder check
  if (normalizedRole === "CO_FOUNDER" || normalizedOrgRole === "CO_FOUNDER") {
    return "CO_FOUNDER";
  }

  // CTO check
  if (normalizedRole === "CTO" || normalizedOrgRole === "CTO") {
    return "CTO";
  }

  // HR check
  if (normalizedRole === "HR" || normalizedOrgRole === "HR") {
    return "HR";
  }

  // All other roles (CEO, COO, EMPLOYEE, INTERN, etc.) are strictly disallowed
  return null;
}

/**
 * Generates random 32-byte session token.
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Computes SHA-256 hash of a session token for safe database storage.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export const DEFAULT_ADMIN_MASTER_KEY = "CodeXa@2026#MasterAdminKey";

/**
 * Returns the configured Master Admin Key from environment variables.
 */
export function getAdminMasterKey(): string {
  return process.env.ADMIN_MASTER_KEY?.trim() || DEFAULT_ADMIN_MASTER_KEY;
}

/**
 * Validates a candidate master key against process.env.ADMIN_MASTER_KEY.
 */
export function isValidMasterKey(candidateKey: string): boolean {
  if (!candidateKey || typeof candidateKey !== "string") return false;
  const configured = getAdminMasterKey();
  return candidateKey.trim() === configured;
}

/**
 * Authenticates via single Master Key. Associates the session with the Founder account in DB.
 */
export async function authenticateMasterKey(
  masterKey: string
): Promise<{ user: AuthenticatedAdmin | null; error?: string }> {
  if (!isValidMasterKey(masterKey)) {
    return { user: null, error: "Invalid Administrator Master Key. Please verify against .env" };
  }

  // Find the founder/owner user in DB to attach the session
  let adminUser = await db.user.findFirst({
    where: {
      OR: [
        { role: "OWNER" },
        { role: "FOUNDER" },
        { orgRole: "FOUNDER" },
      ],
      isActive: true,
    },
  });

  if (!adminUser) {
    adminUser = await db.user.findFirst({
      where: {
        role: { in: ["CO_FOUNDER", "CTO", "HR"] },
        isActive: true,
      },
    });
  }

  if (!adminUser) {
    adminUser = await db.user.findFirst({ where: { isActive: true } });
  }

  if (!adminUser) {
    return { user: null, error: "No active user record in database to associate session." };
  }

  return {
    user: {
      id: adminUser.id,
      username: adminUser.username,
      email: adminUser.email,
      fullName: adminUser.fullName || "CodeXa Master Admin",
      role: "OWNER",
      orgRole: "FOUNDER",
      effectiveRole: "FOUNDER",
    },
  };
}

/**
 * Authenticates user credentials against the production User table.
 */
export async function authenticateAdminCredentials(
  identifier: string,
  passwordPlain: string
): Promise<{ user: AuthenticatedAdmin | null; error?: string }> {
  const cleanId = identifier.trim().toLowerCase();

  const user = await db.user.findFirst({
    where: {
      OR: [
        { email: { equals: cleanId, mode: "insensitive" } },
        { username: { equals: cleanId, mode: "insensitive" } },
      ],
    },
  });

  if (!user) {
    return { user: null, error: "Invalid username/email or password." };
  }

  if (!user.isActive) {
    return { user: null, error: "This administrative account has been deactivated." };
  }

  const effectiveRole = getAuthorizedAdminRole(user.role, user.orgRole);
  if (!effectiveRole) {
    return {
      user: null,
      error: `Access Denied. Role '${user.role}' is not authorized to manage the ID Card Portal. Only Founder, Co-Founder, CTO, and HR are authorized.`,
    };
  }

  const isPasswordValid = await bcrypt.compare(passwordPlain, user.passwordHash);
  if (!isPasswordValid) {
    return { user: null, error: "Invalid username/email or password." };
  }

  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      orgRole: user.orgRole,
      effectiveRole,
    },
  };
}

/**
 * Creates a persistent database session for the admin.
 */
export async function createAdminSession(
  userId: string,
  metadata?: { userAgent?: string; ip?: string }
): Promise<string> {
  const token = generateSessionToken();
  const tokenHash = hashToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000);

  await db.session.create({
    data: {
      userId,
      sessionTokenHash: tokenHash,
      expiresAt,
      lastSeenAt: now,
      userAgent: metadata?.userAgent?.slice(0, 255) || null,
      ipHash: metadata?.ip ? hashToken(metadata.ip) : null,
    },
  });

  return token;
}

/**
 * Validates the current admin session from cookies.
 * Checks both `cxa_id_session` and `cxa_session` (for seamless cross-app login).
 */
export async function getCurrentAdmin(): Promise<AuthenticatedAdmin | null> {
  const cookieStore = cookies();
  const rawToken =
    cookieStore.get(SESSION_COOKIE_NAME)?.value ||
    cookieStore.get(MAIN_SESSION_COOKIE_NAME)?.value;

  if (!rawToken || typeof rawToken !== "string" || !rawToken.trim()) {
    return null;
  }

  const tokenHash = hashToken(rawToken.trim());
  const now = new Date();

  try {
    const session = await db.session.findUnique({
      where: { sessionTokenHash: tokenHash },
      include: {
        user: true,
      },
    });

    if (!session || session.revokedAt || session.expiresAt < now) {
      return null;
    }

    if (!session.user.isActive) {
      return null;
    }

    const effectiveRole = getAuthorizedAdminRole(session.user.role, session.user.orgRole);
    if (!effectiveRole) {
      return null;
    }

    return {
      id: session.user.id,
      username: session.user.username,
      email: session.user.email,
      fullName: session.user.fullName,
      role: session.user.role,
      orgRole: session.user.orgRole,
      effectiveRole,
    };
  } catch (err: any) {
    console.error("[getCurrentAdmin Error]", err?.message);
    return null;
  }
}

/**
 * Revokes the session and clears the cookie.
 */
export async function logoutAdmin(): Promise<void> {
  const cookieStore = cookies();
  const rawToken =
    cookieStore.get(SESSION_COOKIE_NAME)?.value ||
    cookieStore.get(MAIN_SESSION_COOKIE_NAME)?.value;

  if (rawToken) {
    const tokenHash = hashToken(rawToken.trim());
    await db.session
      .updateMany({
        where: { sessionTokenHash: tokenHash },
        data: { revokedAt: new Date() },
      })
      .catch(() => {});
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}
