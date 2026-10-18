import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendPhotoRejectedEmail } from "@/lib/email";
import { getPermanentLinkForIntern } from "@/lib/intern-links";
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
          include: {
            employmentProfile: true,
            idCardInvitations: {
              orderBy: { createdAt: "desc" },
            },
          },
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

    const safeRejectionReason =
      rejectionReason && rejectionReason.trim().length > 0
        ? rejectionReason.trim()
        : "Photograph does not meet official passport framing, background, or lighting standards.";

    // Get the intern's authoritative permanent direct upload link
    const permanentUploadUrl =
      getPermanentLinkForIntern(employeeId) ||
      getPermanentLinkForIntern(submission.user.email) ||
      "https://id.codxa-agency.online/";

    let emailResult = null;

    await db.$transaction(async (tx) => {
      // 1. Update submission status and rejection reason
      await tx.idCardPhotoSubmission.update({
        where: { id: submissionId },
        data: {
          status: newStatus,
          rejectionReason: action === "REJECT" ? safeRejectionReason : null,
          reviewedBy: admin.id,
          reviewedByName: admin.fullName || admin.username,
          reviewedAt: now,
        },
      });

      // 2. If rejected, keep the intern's existing invitation active with extended validity
      // so they can seamlessly resubmit with their SAME permanent link!
      if (action === "REJECT") {
        await tx.idCardInvitation.updateMany({
          where: { userId: submission.userId },
          data: {
            status: "ACTIVE",
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            revokedAt: null,
            revokedBy: null,
          },
        });
      }
    });

    // 3. Send email to intern if rejected, containing rejection reason and "Upload Again" button with their same link
    if (action === "REJECT" && submission.user.email) {
      emailResult = await sendPhotoRejectedEmail({
        internName: submission.user.fullName || employeeId,
        internId: employeeId,
        recipientEmail: submission.user.email,
        uploadUrl: permanentUploadUrl,
        rejectionReason: safeRejectionReason,
      });
    }

    // 4. Audit log
    await logAuditEvent({
      actorId: admin.id,
      actorName: admin.fullName || admin.username,
      actorRole: admin.effectiveRole,
      action: action === "APPROVE" ? "PHOTO_APPROVED" : "PHOTO_REJECTED",
      targetInternId: employeeId,
      targetInternName: submission.user.fullName,
      details: {
        submissionId,
        rejectionReason: action === "REJECT" ? safeRejectionReason : undefined,
        uploadUrl: permanentUploadUrl,
        emailResult,
      },
      req: request,
    });

    return NextResponse.json({
      success: true,
      status: newStatus,
      submissionId,
      uploadUrl: permanentUploadUrl,
      emailSent: emailResult?.success ?? false,
      message: `Photo ${action === "APPROVE" ? "approved" : "rejected"} successfully.${
        action === "REJECT"
          ? emailResult?.success
            ? " Rejection email with 'Upload Again' button sent to intern."
            : " Email notification attempted."
          : ""
      }`,
    });
  } catch (err: any) {
    console.error("[POST /api/admin/photos/review Error]", err);
    return NextResponse.json(
      { error: "Failed to update review status." },
      { status: 500 }
    );
  }
}
