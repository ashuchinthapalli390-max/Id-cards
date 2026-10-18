import { db } from "./db";
import { NextRequest } from "next/server";

export type AuditAction =
  | "ADMIN_LOGIN"
  | "ADMIN_LOGOUT"
  | "INVITATION_GENERATED"
  | "BULK_INVITATIONS_GENERATED"
  | "INVITATION_REVOKED"
  | "INVITATION_EMAIL_SENT"
  | "BULK_EMAILS_SENT"
  | "PHOTO_SUBMITTED"
  | "PHOTO_APPROVED"
  | "PHOTO_REJECTED"
  | "SUBMISSION_REOPENED"
  | "ZIP_EXPORT_DOWNLOADED"
  | "SINGLE_PHOTO_DOWNLOADED";

interface LogAuditParams {
  actorId?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  actorType?: "ADMIN" | "INTERN" | "SYSTEM";
  action: AuditAction;
  targetInternId?: string | null;
  targetInternName?: string | null;
  details?: Record<string, any> | null;
  req?: NextRequest | Request | null;
}

export function getClientIp(req?: NextRequest | Request | null): string | null {
  if (!req) return null;
  try {
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }
    const realIp = req.headers.get("x-real-ip");
    if (realIp) return realIp.trim();
  } catch {}
  return null;
}

export function getUserAgent(req?: NextRequest | Request | null): string | null {
  if (!req) return null;
  try {
    return req.headers.get("user-agent")?.slice(0, 500) || null;
  } catch {}
  return null;
}

/**
 * Creates an audit log record in PostgreSQL.
 * Note: Never log raw tokens or passwords.
 */
export async function logAuditEvent({
  actorId,
  actorName,
  actorRole,
  actorType = "ADMIN",
  action,
  targetInternId,
  targetInternName,
  details,
  req,
}: LogAuditParams): Promise<void> {
  try {
    const ipAddress = getClientIp(req);
    const userAgent = getUserAgent(req);

    await db.idCardAuditLog.create({
      data: {
        actorId: actorId ?? null,
        actorName: actorName ?? null,
        actorRole: actorRole ?? null,
        actorType,
        action,
        targetInternId: targetInternId ?? null,
        targetInternName: targetInternName ?? null,
        details: details ?? undefined,
        ipAddress,
        userAgent,
      },
    });
  } catch (err: any) {
    console.error("[logAuditEvent Error]", err?.message);
  }
}
