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

    // Use the intern's authoritative permanent direct upload link
    if (!uploadUrl) {
      uploadUrl =
        getPermanentLinkForIntern(employeeId) ||
        getPermanentLinkForIntern(intern.email);
    }

    let activeInvitation = intern.idCardInvitations[0];
    if (activeInvitation) {
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
