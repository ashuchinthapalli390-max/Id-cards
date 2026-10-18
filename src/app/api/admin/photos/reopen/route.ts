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
    const { submissionId, userId } = body;

    let targetUserId = userId;
    let submission: any = null;

    if (submissionId) {
      submission = await db.idCardPhotoSubmission.findUnique({
        where: { id: submissionId },
        include: { user: { include: { employmentProfile: true } } },
      });
      if (submission) {
        targetUserId = submission.userId;
      }
    }

    if (!targetUserId) {
      return NextResponse.json(
        { error: "submissionId or userId is required." },
        { status: 400 }
      );
    }

    const intern = await db.user.findUnique({
      where: { id: targetUserId },
      include: { employmentProfile: true },
    });

    if (!intern || intern.role !== "INTERN") {
      return NextResponse.json({ error: "Intern not found." }, { status: 404 });
    }

    const employeeId =
      intern.employmentProfile?.employeeId || `CXA-INT-${intern.id.slice(-4)}`;
    const now = new Date();

    // Revoke old active invitations
    await db.idCardInvitation.updateMany({
      where: { userId: intern.id, status: "ACTIVE" },
      data: { status: "REVOKED", revokedAt: now, revokedBy: admin.id },
    });

    // Generate new active invitation token
    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = calculateExpiryDate(7);

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
      action: "SUBMISSION_REOPENED",
      targetInternId: employeeId,
      targetInternName: intern.fullName,
      details: {
        invitationId: invitation.id,
        reopenedSubmissionId: submissionId || null,
      },
      req: request,
    });

    return NextResponse.json({
      success: true,
      message: `Submission reopened for ${intern.fullName || employeeId}.`,
      invitation: {
        id: invitation.id,
        uploadUrl,
        rawToken,
        expiresAt: invitation.expiresAt,
        employeeId,
      },
    });
  } catch (err: any) {
    console.error("[POST /api/admin/photos/reopen Error]", err);
    return NextResponse.json(
      { error: "Failed to reopen photo submission." },
      { status: 500 }
    );
  }
}
