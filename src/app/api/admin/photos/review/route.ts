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
    const {
      submissionId,
      action, // "APPROVE" | "REJECT"
      rejectionReason,
      requestResubmission = false,
    } = body;

    if (!submissionId || !action) {
      return NextResponse.json(
        { error: "submissionId and action ('APPROVE' or 'REJECT') are required." },
        { status: 400 }
      );
    }

    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json(
        { error: "Action must be 'APPROVE' or 'REJECT'." },
        { status: 400 }
      );
    }

    const submission = await db.idCardPhotoSubmission.findUnique({
      where: { id: submissionId },
      include: {
        user: {
          include: { employmentProfile: true },
        },
      },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }

    const now = new Date();
    const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";
    const employeeId =
      submission.user.employmentProfile?.employeeId ||
      `CXA-INT-${submission.user.id.slice(-4)}`;

    let newUploadUrl: string | null = null;

    await db.$transaction(async (tx) => {
      // Update submission status
      await tx.idCardPhotoSubmission.update({
        where: { id: submissionId },
        data: {
          status: newStatus,
          rejectionReason: action === "REJECT" ? rejectionReason || "Photo does not meet specifications." : null,
          reviewedBy: admin.id,
          reviewedByName: admin.fullName || admin.username,
          reviewedAt: now,
        },
      });

      // If rejected and resubmission requested, generate fresh invitation link
      if (action === "REJECT" && requestResubmission) {
        // Revoke older active invitations
        await tx.idCardInvitation.updateMany({
          where: { userId: submission.userId, status: "ACTIVE" },
          data: { status: "REVOKED", revokedAt: now, revokedBy: admin.id },
        });

        const rawToken = generateSecureToken();
        const tokenHash = hashToken(rawToken);
        const expiresAt = calculateExpiryDate(7);

        await tx.idCardInvitation.create({
          data: {
            userId: submission.userId,
            tokenHash,
            status: "ACTIVE",
            expiresAt,
            createdBy: admin.id,
            createdByName: admin.fullName || admin.username,
          },
        });

        newUploadUrl = buildUploadUrl(rawToken);
      }
    });

    // Audit log
    await logAuditEvent({
      actorId: admin.id,
      actorName: admin.fullName || admin.username,
      actorRole: admin.effectiveRole,
      action: action === "APPROVE" ? "PHOTO_APPROVED" : "PHOTO_REJECTED",
      targetInternId: employeeId,
      targetInternName: submission.user.fullName,
      details: {
        submissionId,
        rejectionReason: action === "REJECT" ? rejectionReason : undefined,
        requestResubmission,
      },
      req: request,
    });

    return NextResponse.json({
      success: true,
      status: newStatus,
      submissionId,
      newUploadUrl,
      message: `Photo ${action === "APPROVE" ? "approved" : "rejected"} successfully.`,
    });
  } catch (err: any) {
    console.error("[POST /api/admin/photos/review Error]", err);
    return NextResponse.json(
      { error: "Failed to update review status." },
      { status: 500 }
    );
  }
}
