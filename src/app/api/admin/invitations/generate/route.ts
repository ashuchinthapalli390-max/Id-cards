import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  generateSecureToken,
  hashToken,
  calculateExpiryDate,
  buildUploadUrl,
} from "@/lib/tokens";
import { logAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { userId, expiryDays = 7, forceRegenerate = false } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required." }, { status: 400 });
    }

    // Verify intern exists
    const intern = await db.user.findUnique({
      where: { id: userId },
      include: {
        employmentProfile: true,
        idCardInvitations: {
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!intern || intern.role !== "INTERN") {
      return NextResponse.json(
        { error: "Intern record not found." },
        { status: 404 }
      );
    }

    const employeeId =
      intern.employmentProfile?.employeeId || `CXA-INT-${intern.id.slice(-4)}`;

    // If active invitations exist and regenerate was requested, revoke older ones
    if (intern.idCardInvitations.length > 0) {
      await db.idCardInvitation.updateMany({
        where: {
          userId: intern.id,
          status: "ACTIVE",
        },
        data: {
          status: "REVOKED",
          revokedAt: new Date(),
          revokedBy: admin.id,
        },
      });
    }

    // Generate new 256-bit cryptographically secure token
    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = calculateExpiryDate(expiryDays);

    const invitation = await db.idCardInvitation.create({
      data: {
        userId: intern.id,
        tokenHash,
        status: "ACTIVE",
        expiresAt,
        createdBy: admin.id,
        createdByName: admin.fullName || admin.username,
      },
    });

    const uploadUrl = buildUploadUrl(rawToken);

    // Audit log
    await logAuditEvent({
      actorId: admin.id,
      actorName: admin.fullName || admin.username,
      actorRole: admin.effectiveRole,
      action: "INVITATION_GENERATED",
      targetInternId: employeeId,
      targetInternName: intern.fullName,
      details: {
        invitationId: invitation.id,
        expiresAt: expiresAt.toISOString(),
        forceRegenerate,
      },
      req: request,
    });

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        rawToken,
        uploadUrl,
        expiresAt: invitation.expiresAt,
        internName: intern.fullName || intern.username,
        employeeId,
        email: intern.email,
        phone: intern.phone || intern.employmentProfile?.phone,
      },
    });
  } catch (err: any) {
    console.error("[POST /api/admin/invitations/generate Error]", err);
    return NextResponse.json(
      { error: "Failed to generate upload invitation link." },
      { status: 500 }
    );
  }
}
