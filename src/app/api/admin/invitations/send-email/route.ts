import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendInternInvitationEmail } from "@/lib/email";
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
    const { userId, customUploadUrl } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required." }, { status: 400 });
    }

    const intern = await db.user.findUnique({
      where: { id: userId },
      include: {
        employmentProfile: true,
        idCardInvitations: {
          where: { status: "ACTIVE", expiresAt: { gt: new Date() } },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!intern || intern.role !== "INTERN") {
      return NextResponse.json({ error: "Intern record not found." }, { status: 404 });
    }

    const employeeId =
      intern.employmentProfile?.employeeId || `CXA-INT-${intern.id.slice(-4)}`;
    const internName = intern.fullName || intern.username;

    let uploadUrl = customUploadUrl;
    let invitationId: string | undefined;

    // If an upload URL was not passed directly, look up active or generate a new one
    if (!uploadUrl) {
      let activeInvitation = intern.idCardInvitations[0];
      if (!activeInvitation) {
        // Generate new invitation automatically
        const rawToken = generateSecureToken();
        const tokenHash = hashToken(rawToken);
        const expiresAt = calculateExpiryDate(7);

        activeInvitation = await db.idCardInvitation.create({
          data: {
            userId: intern.id,
            tokenHash,
            status: "ACTIVE",
            expiresAt,
            createdBy: admin.id,
            createdByName: admin.fullName || admin.username,
          },
        });
        uploadUrl = buildUploadUrl(rawToken);
      } else {
        // If an existing token hash exists in DB, we cannot reverse the hash.
        // Therefore, we generate a fresh link to ensure the email receives a working token:
        await db.idCardInvitation.update({
          where: { id: activeInvitation.id },
          data: { status: "REVOKED", revokedAt: new Date(), revokedBy: admin.id },
        });

        const rawToken = generateSecureToken();
        const tokenHash = hashToken(rawToken);
        const expiresAt = calculateExpiryDate(7);

        const freshInvitation = await db.idCardInvitation.create({
          data: {
            userId: intern.id,
            tokenHash,
            status: "ACTIVE",
            expiresAt,
            createdBy: admin.id,
            createdByName: admin.fullName || admin.username,
          },
        });
        uploadUrl = buildUploadUrl(rawToken);
        activeInvitation = freshInvitation;
      }
      invitationId = activeInvitation.id;
    }

    // Send email via Resend
    const emailResult = await sendInternInvitationEmail({
      internName,
      internId: employeeId,
      recipientEmail: intern.email,
      uploadUrl,
      invitationId,
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { success: false, error: emailResult.error || "Failed to deliver email." },
        { status: 500 }
      );
    }

    await logAuditEvent({
      actorId: admin.id,
      actorName: admin.fullName || admin.username,
      actorRole: admin.effectiveRole,
      action: "INVITATION_EMAIL_SENT",
      targetInternId: employeeId,
      targetInternName: internName,
      details: {
        recipientEmail: intern.email,
        messageId: emailResult.messageId,
      },
      req: request,
    });

    return NextResponse.json({
      success: true,
      messageId: emailResult.messageId,
      email: intern.email,
      message: `Invitation email sent to ${intern.email}.`,
    });
  } catch (err: any) {
    console.error("[POST /api/admin/invitations/send-email Error]", err);
    return NextResponse.json(
      { error: "Internal server error dispatching email." },
      { status: 500 }
    );
  }
}
