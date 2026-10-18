import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { invitationId } = body;

    if (!invitationId) {
      return NextResponse.json({ error: "invitationId is required." }, { status: 400 });
    }

    const invitation = await db.idCardInvitation.findUnique({
      where: { id: invitationId },
      include: {
        user: {
          include: { employmentProfile: true },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
    }

    await db.idCardInvitation.update({
      where: { id: invitationId },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
        revokedBy: admin.id,
      },
    });

    const employeeId =
      invitation.user.employmentProfile?.employeeId || `CXA-INT-${invitation.user.id.slice(-4)}`;

    await logAuditEvent({
      actorId: admin.id,
      actorName: admin.fullName || admin.username,
      actorRole: admin.effectiveRole,
      action: "INVITATION_REVOKED",
      targetInternId: employeeId,
      targetInternName: invitation.user.fullName,
      details: { invitationId },
      req: request,
    });

    return NextResponse.json({
      success: true,
      message: "Invitation link revoked successfully.",
    });
  } catch (err: any) {
    console.error("[POST /api/admin/invitations/revoke Error]", err);
    return NextResponse.json(
      { error: "Failed to revoke invitation." },
      { status: 500 }
    );
  }
}
