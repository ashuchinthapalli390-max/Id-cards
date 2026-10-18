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
    const { userIds, allPending = false } = body;

    const now = new Date();

    let queryWhere: any = {
      role: "INTERN",
      isActive: true,
    };

    if (Array.isArray(userIds) && userIds.length > 0) {
      queryWhere.id = { in: userIds };
    } else if (allPending) {
      // Pending interns: those without approved photo submission
      queryWhere.idCardSubmissions = {
        none: { status: "APPROVED" },
      };
    } else {
      return NextResponse.json(
        { error: "Please specify userIds or set allPending to true." },
        { status: 400 }
      );
    }

    const interns = await db.user.findMany({
      where: queryWhere,
      include: {
        employmentProfile: true,
        idCardInvitations: {
          where: { status: "ACTIVE", expiresAt: { gt: now } },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    const results: Array<{
      userId: string;
      email: string;
      employeeId: string;
      success: boolean;
      error?: string;
    }> = [];

    let successCount = 0;
    let failureCount = 0;

    for (const intern of interns) {
      const ep = intern.employmentProfile;
      const employeeId = ep?.employeeId || `CXA-INT-${intern.id.slice(-4)}`;
      const internName = intern.fullName || intern.username;

      // Revoke any previous active invitations and generate fresh link for guaranteed delivery
      await db.idCardInvitation.updateMany({
        where: { userId: intern.id, status: "ACTIVE" },
        data: { status: "REVOKED", revokedAt: now, revokedBy: admin.id },
      });

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

      // Send email via Resend
      const emailRes = await sendInternInvitationEmail({
        internName,
        internId: employeeId,
        recipientEmail: intern.email,
        uploadUrl,
        invitationId: invitation.id,
      });

      if (emailRes.success) {
        successCount++;
        results.push({
          userId: intern.id,
          email: intern.email,
          employeeId,
          success: true,
        });
      } else {
        failureCount++;
        results.push({
          userId: intern.id,
          email: intern.email,
          employeeId,
          success: false,
          error: emailRes.error,
        });
      }

      // Small throttle to stay well within provider rate limits (500ms)
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Log audit event
    await logAuditEvent({
      actorId: admin.id,
      actorName: admin.fullName || admin.username,
      actorRole: admin.effectiveRole,
      action: "BULK_EMAILS_SENT",
      details: {
        totalAttempted: interns.length,
        successCount,
        failureCount,
      },
      req: request,
    });

    return NextResponse.json({
      success: true,
      totalAttempted: interns.length,
      successCount,
      failureCount,
      results,
      message: `Dispatched ${successCount} emails (${failureCount} failed).`,
    });
  } catch (err: any) {
    console.error("[POST /api/admin/invitations/bulk-send-email Error]", err);
    return NextResponse.json(
      { error: "Failed to dispatch bulk emails." },
      { status: 500 }
    );
  }
}
